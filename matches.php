<?php
// matches.php - PHP Backend API for Matches Management

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

    // GET - Fetch all matches
    if ($_SERVER['REQUEST_METHOD'] == 'GET' && $action == 'get') {
        $stmt = $pdo->prepare("
            SELECT 
                m.*,
                t.TeamName,
                sc.CategoryName as SportCategory,
                u1.user_name as created_by_name,
                u2.user_name as modified_by_name
            FROM matches m
            LEFT JOIN sportsteams t ON m.TeamID = t.TeamID
            LEFT JOIN sportscategories sc ON t.SportCategoryID = sc.SportCategoryID
            LEFT JOIN users u1 ON m.CreatedBy = u1.user_id
            LEFT JOIN users u2 ON m.ModifiedBy = u2.user_id
            ORDER BY m.MatchDate DESC
        ");
        $stmt->execute();
        $matches = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        sendResponse(true, 'Matches fetched successfully', $matches);
    }
    
    // GET - Get matches by team
    elseif ($_SERVER['REQUEST_METHOD'] == 'GET' && $action == 'get_by_team' && isset($_GET['team_id'])) {
        $stmt = $pdo->prepare("
            SELECT 
                m.*,
                t.TeamName
            FROM matches m
            LEFT JOIN sportsteams t ON m.TeamID = t.TeamID
            WHERE m.TeamID = ?
            ORDER BY m.MatchDate DESC
        ");
        $stmt->execute([$_GET['team_id']]);
        $matches = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        sendResponse(true, 'Team matches fetched successfully', $matches);
    }
    
    // GET - Get upcoming matches
    elseif ($_SERVER['REQUEST_METHOD'] == 'GET' && $action == 'get_upcoming') {
        $stmt = $pdo->prepare("
            SELECT 
                m.*,
                t.TeamName,
                sc.CategoryName as SportCategory
            FROM matches m
            LEFT JOIN sportsteams t ON m.TeamID = t.TeamID
            LEFT JOIN sportscategories sc ON t.SportCategoryID = sc.SportCategoryID
            WHERE m.MatchDate > NOW() AND (m.Result IS NULL OR m.Result NOT IN ('Cancelled', 'Postponed'))
            ORDER BY m.MatchDate ASC
            LIMIT 20
        ");
        $stmt->execute();
        $matches = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        sendResponse(true, 'Upcoming matches fetched successfully', $matches);
    }
    
    // GET - Get recent results
    elseif ($_SERVER['REQUEST_METHOD'] == 'GET' && $action == 'get_recent') {
        $stmt = $pdo->prepare("
            SELECT 
                m.*,
                t.TeamName,
                sc.CategoryName as SportCategory
            FROM matches m
            LEFT JOIN sportsteams t ON m.TeamID = t.TeamID
            LEFT JOIN sportscategories sc ON t.SportCategoryID = sc.SportCategoryID
            WHERE m.MatchDate < NOW() AND m.Result IS NOT NULL
            ORDER BY m.MatchDate DESC
            LIMIT 20
        ");
        $stmt->execute();
        $matches = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        sendResponse(true, 'Recent results fetched successfully', $matches);
    }
    
    // GET - Get single match
    elseif ($_SERVER['REQUEST_METHOD'] == 'GET' && $action == 'get_one' && isset($_GET['id'])) {
        $stmt = $pdo->prepare("
            SELECT 
                m.*,
                t.TeamName,
                u1.user_name as created_by_name
            FROM matches m
            LEFT JOIN sportsteams t ON m.TeamID = t.TeamID
            LEFT JOIN users u1 ON m.CreatedBy = u1.user_id
            WHERE m.MatchID = ?
        ");
        $stmt->execute([$_GET['id']]);
        $match = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($match) {
            sendResponse(true, 'Match fetched successfully', $match);
        } else {
            sendResponse(false, 'Match not found');
        }
    }
    
    // POST - Add new match
    elseif ($_SERVER['REQUEST_METHOD'] == 'POST' && $action == 'add') {
        // Validate required fields
        $required = ['TeamID', 'OpponentName', 'MatchDate', 'Location'];
        foreach ($required as $field) {
            if (empty($input[$field])) {
                sendResponse(false, "Missing required field: $field");
            }
        }
        
        // Insert match
        $stmt = $pdo->prepare("
            INSERT INTO matches (TeamID, OpponentName, MatchType, MatchDate, Location, HomeAway, OurScore, OpponentScore, Result, Notes, CreatedBy) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $input['TeamID'],
            $input['OpponentName'],
            $input['MatchType'] ?? 'Friendly',
            $input['MatchDate'],
            $input['Location'],
            $input['HomeAway'] ?? 'Home',
            $input['OurScore'] ?? null,
            $input['OpponentScore'] ?? null,
            $input['Result'] ?? null,
            $input['Notes'] ?? null,
            $input['CreatedBy'] ?? null
        ]);
        
        $last_id = $pdo->lastInsertId();
        sendResponse(true, 'Match added successfully', ['MatchID' => $last_id]);
    }
    
    // POST - Update match
    elseif (($_SERVER['REQUEST_METHOD'] == 'PUT' || $_SERVER['REQUEST_METHOD'] == 'POST') && $action == 'update') {
        if (empty($input['MatchID'])) {
            sendResponse(false, 'MatchID is required for update');
        }
        
        // Calculate result based on scores if not provided
        $result = $input['Result'];
        if (isset($input['OurScore']) && isset($input['OpponentScore']) && !$result) {
            if ($input['OurScore'] > $input['OpponentScore']) {
                $result = 'Win';
            } elseif ($input['OurScore'] < $input['OpponentScore']) {
                $result = 'Loss';
            } else {
                $result = 'Draw';
            }
        }
        
        $stmt = $pdo->prepare("
            UPDATE matches 
            SET TeamID = ?, 
                OpponentName = ?, 
                MatchType = ?, 
                MatchDate = ?, 
                Location = ?, 
                HomeAway = ?, 
                OurScore = ?, 
                OpponentScore = ?, 
                Result = ?, 
                Notes = ?, 
                ModifiedBy = ?,
                ModifiedOn = NOW()
            WHERE MatchID = ?
        ");
        $stmt->execute([
            $input['TeamID'],
            $input['OpponentName'],
            $input['MatchType'] ?? 'Friendly',
            $input['MatchDate'],
            $input['Location'],
            $input['HomeAway'] ?? 'Home',
            $input['OurScore'] ?? null,
            $input['OpponentScore'] ?? null,
            $result,
            $input['Notes'] ?? null,
            $input['ModifiedBy'] ?? null,
            $input['MatchID']
        ]);
        
        sendResponse(true, 'Match updated successfully');
    }
    
    // POST - Update match result only
    elseif (($_SERVER['REQUEST_METHOD'] == 'PUT' || $_SERVER['REQUEST_METHOD'] == 'POST') && $action == 'update_result') {
        if (empty($input['MatchID'])) {
            sendResponse(false, 'MatchID is required');
        }
        
        if (!isset($input['OurScore']) || !isset($input['OpponentScore'])) {
            sendResponse(false, 'Both scores are required');
        }
        
        // Calculate result
        if ($input['OurScore'] > $input['OpponentScore']) {
            $result = 'Win';
        } elseif ($input['OurScore'] < $input['OpponentScore']) {
            $result = 'Loss';
        } else {
            $result = 'Draw';
        }
        
        $stmt = $pdo->prepare("
            UPDATE matches 
            SET OurScore = ?, OpponentScore = ?, Result = ?, ModifiedBy = ?, ModifiedOn = NOW()
            WHERE MatchID = ?
        ");
        $stmt->execute([
            $input['OurScore'],
            $input['OpponentScore'],
            $result,
            $input['ModifiedBy'] ?? null,
            $input['MatchID']
        ]);
        
        sendResponse(true, 'Match result updated successfully');
    }
    
    // POST - Delete match
    elseif (($_SERVER['REQUEST_METHOD'] == 'DELETE' || $_SERVER['REQUEST_METHOD'] == 'POST') && $action == 'delete') {
        if (empty($input['MatchID'])) {
            sendResponse(false, 'MatchID is required for deletion');
        }
        
        $stmt = $pdo->prepare("DELETE FROM matches WHERE MatchID = ?");
        $stmt->execute([$input['MatchID']]);
        
        sendResponse(true, 'Match deleted successfully');
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