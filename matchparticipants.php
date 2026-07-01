<?php
// matchparticipants.php - PHP Backend API for Match Participants Management

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

// Database configuration
$host = 'localhost';
$dbname = 'cam';
$username = 'root';
$password = '';

function sendResponse($success, $message, $data = null) {
    echo json_encode([
        'success' => $success,
        'message' => $message,
        'data' => $data
    ]);
    exit;
}

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Get input data
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    $action = $_GET['action'] ?? $input['action'] ?? '';

    // GET - Fetch all match participants
    if ($_SERVER['REQUEST_METHOD'] == 'GET' && $action == 'get') {
        $stmt = $pdo->prepare("
            SELECT 
                mp.*,
                m.TeamID,
                m.OpponentName,
                m.MatchDate,
                m.Location,
                t.TeamName,
                u.user_name as student_name,
                u.email as student_email,
                u.phone as student_phone,
                creator.user_name as created_by_name
            FROM matchparticipants mp
            LEFT JOIN matches m ON mp.MatchID = m.MatchID
            LEFT JOIN sportsteams t ON m.TeamID = t.TeamID
            LEFT JOIN users u ON mp.student_id = u.user_id
            LEFT JOIN users creator ON mp.CreatedBy = creator.user_id
            ORDER BY m.MatchDate DESC, mp.ParticipationStatus
        ");
        $stmt->execute();
        $participants = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        sendResponse(true, 'Match participants fetched successfully', $participants);
    }
    
    // GET - Get participants by match
    elseif ($_SERVER['REQUEST_METHOD'] == 'GET' && $action == 'get_by_match' && isset($_GET['match_id'])) {
        $stmt = $pdo->prepare("
            SELECT 
                mp.*,
                u.user_name as student_name,
                u.email as student_email,
                u.phone as student_phone,
                tm.Position,
                tm.JerseyNumber
            FROM matchparticipants mp
            JOIN users u ON mp.student_id = u.user_id
            LEFT JOIN teammemberships tm ON tm.student_id = mp.student_id AND tm.Status = 'Active'
            WHERE mp.MatchID = ?
            ORDER BY 
                CASE mp.ParticipationStatus 
                    WHEN 'Played' THEN 1
                    WHEN 'Substitute' THEN 2
                    ELSE 3
                END,
                tm.JerseyNumber
        ");
        $stmt->execute([$_GET['match_id']]);
        $participants = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        sendResponse(true, 'Match participants fetched successfully', $participants);
    }
    
    // GET - Get participants by student
    elseif ($_SERVER['REQUEST_METHOD'] == 'GET' && $action == 'get_by_student' && isset($_GET['student_id'])) {
        $stmt = $pdo->prepare("
            SELECT 
                mp.*,
                m.OpponentName,
                m.MatchDate,
                m.OurScore,
                m.OpponentScore,
                m.Result,
                t.TeamName
            FROM matchparticipants mp
            JOIN matches m ON mp.MatchID = m.MatchID
            JOIN sportsteams t ON m.TeamID = t.TeamID
            WHERE mp.student_id = ?
            ORDER BY m.MatchDate DESC
        ");
        $stmt->execute([$_GET['student_id']]);
        $participants = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        sendResponse(true, 'Student match history fetched successfully', $participants);
    }
    
    // GET - Get available players for a match (team members not yet added)
    elseif ($_SERVER['REQUEST_METHOD'] == 'GET' && $action == 'get_available_players' && isset($_GET['match_id'])) {
        // Get team ID from match
        $getTeam = $pdo->prepare("SELECT TeamID FROM matches WHERE MatchID = ?");
        $getTeam->execute([$_GET['match_id']]);
        $match = $getTeam->fetch(PDO::FETCH_ASSOC);
        
        if (!$match) {
            sendResponse(false, 'Match not found');
        }
        
        $teamId = $match['TeamID'];
        
        // Get players already added to this match
        $addedPlayers = $pdo->prepare("SELECT student_id FROM matchparticipants WHERE MatchID = ?");
        $addedPlayers->execute([$_GET['match_id']]);
        $addedIds = $addedPlayers->fetchAll(PDO::FETCH_COLUMN);
        
        $placeholders = str_repeat('?,', count($addedIds) - 1);
        $excludeCondition = '';
        if (!empty($addedIds)) {
            $excludeCondition = "AND u.user_id NOT IN (" . implode(',', array_fill(0, count($addedIds), '?')) . ")";
        }
        
        $sql = "
            SELECT 
                u.user_id,
                u.user_name,
                u.email,
                tm.Position,
                tm.JerseyNumber
            FROM teammemberships tm
            JOIN users u ON tm.student_id = u.user_id
            WHERE tm.TeamID = ? AND tm.Status = 'Active'
            $excludeCondition
            ORDER BY tm.JerseyNumber
        ";
        
        $stmt = $pdo->prepare($sql);
        $params = [$teamId];
        if (!empty($addedIds)) {
            $params = array_merge($params, $addedIds);
        }
        $stmt->execute($params);
        $players = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        sendResponse(true, 'Available players fetched successfully', $players);
    }
    
    // POST - Add match participant
    elseif ($_SERVER['REQUEST_METHOD'] == 'POST' && $action == 'add') {
        // Validate required fields
        if (empty($input['MatchID']) || empty($input['student_id'])) {
            sendResponse(false, 'Match ID and Student ID are required');
        }
        
        // Check if student is already added to this match
        $check_stmt = $pdo->prepare("SELECT MatchParticipantID FROM matchparticipants WHERE MatchID = ? AND student_id = ?");
        $check_stmt->execute([$input['MatchID'], $input['student_id']]);
        if ($check_stmt->fetch()) {
            sendResponse(false, 'Student is already added to this match');
        }
        
        // Insert match participant
        $stmt = $pdo->prepare("
            INSERT INTO matchparticipants (MatchID, student_id, ParticipationStatus, MinutesPlayed, Performance, CreatedBy) 
            VALUES (?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $input['MatchID'],
            $input['student_id'],
            $input['ParticipationStatus'] ?? 'Selected',
            $input['MinutesPlayed'] ?? 0,
            $input['Performance'] ?? null,
            $input['CreatedBy'] ?? null
        ]);
        
        $last_id = $pdo->lastInsertId();
        sendResponse(true, 'Match participant added successfully', ['MatchParticipantID' => $last_id]);
    }
    
    // POST - Update match participant
    elseif (($_SERVER['REQUEST_METHOD'] == 'PUT' || $_SERVER['REQUEST_METHOD'] == 'POST') && $action == 'update') {
        if (empty($input['MatchParticipantID'])) {
            sendResponse(false, 'MatchParticipantID is required for update');
        }
        
        $stmt = $pdo->prepare("
            UPDATE matchparticipants 
            SET ParticipationStatus = ?, 
                MinutesPlayed = ?, 
                Performance = ?, 
                ModifiedBy = ?,
                ModifiedOn = NOW()
            WHERE MatchParticipantID = ?
        ");
        $stmt->execute([
            $input['ParticipationStatus'] ?? 'Selected',
            $input['MinutesPlayed'] ?? 0,
            $input['Performance'] ?? null,
            $input['ModifiedBy'] ?? null,
            $input['MatchParticipantID']
        ]);
        
        sendResponse(true, 'Match participant updated successfully');
    }
    
    // POST - Delete match participant
    elseif (($_SERVER['REQUEST_METHOD'] == 'DELETE' || $_SERVER['REQUEST_METHOD'] == 'POST') && $action == 'delete') {
        if (empty($input['MatchParticipantID'])) {
            sendResponse(false, 'MatchParticipantID is required for deletion');
        }
        
        $stmt = $pdo->prepare("DELETE FROM matchparticipants WHERE MatchParticipantID = ?");
        $stmt->execute([$input['MatchParticipantID']]);
        
        sendResponse(true, 'Match participant deleted successfully');
    }
    
    else {
        sendResponse(false, 'Invalid action or method');
    }
    
} catch (PDOException $e) {
    error_log("Database error: " . $e->getMessage());
    sendResponse(false, 'Database error: ' . $e->getMessage());
} catch (Exception $e) {
    error_log("General error: " . $e->getMessage());
    sendResponse(false, 'Server error: ' . $e->getMessage());
}
?>