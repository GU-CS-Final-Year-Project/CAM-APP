<?php
// teammemberships.php - PHP Backend API for Team Memberships Management

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

    // GET - Fetch all team memberships
    if ($_SERVER['REQUEST_METHOD'] == 'GET' && $action == 'get') {
        $stmt = $pdo->prepare("
            SELECT 
                tm.TeamMembershipID,
                tm.TeamID,
                tm.student_id,
                tm.Position,
                tm.JerseyNumber,
                tm.JoinDate,
                tm.EndDate,
                tm.Status,
                tm.CreatedBy,
                tm.CreatedOn,
                tm.ModifiedBy,
                tm.ModifiedOn,
                t.TeamName,
                u.user_name as student_name,
                u.email as student_email,
                u.phone as student_phone,
                creator.user_name as created_by_name
            FROM teammemberships tm
            LEFT JOIN sportsteams t ON tm.TeamID = t.TeamID
            LEFT JOIN users u ON tm.student_id = u.user_id
            LEFT JOIN users creator ON tm.CreatedBy = creator.user_id
            ORDER BY tm.CreatedOn DESC
        ");
        $stmt->execute();
        $memberships = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        sendResponse(true, 'Team memberships fetched successfully', $memberships);
    }
    
    // GET - Get memberships by team
    elseif ($_SERVER['REQUEST_METHOD'] == 'GET' && $action == 'get_by_team' && isset($_GET['team_id'])) {
        $stmt = $pdo->prepare("
            SELECT 
                tm.*,
                u.user_name as student_name,
                u.email as student_email,
                u.phone as student_phone
            FROM teammemberships tm
            JOIN users u ON tm.student_id = u.user_id
            WHERE tm.TeamID = ?
            ORDER BY tm.Status DESC, tm.JoinDate DESC
        ");
        $stmt->execute([$_GET['team_id']]);
        $members = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        sendResponse(true, 'Team members fetched successfully', $members);
    }
    
    // GET - Get memberships by student
    elseif ($_SERVER['REQUEST_METHOD'] == 'GET' && $action == 'get_by_student' && isset($_GET['student_id'])) {
        $stmt = $pdo->prepare("
            SELECT 
                tm.*,
                t.TeamName,
                sc.CategoryName
            FROM teammemberships tm
            JOIN sportsteams t ON tm.TeamID = t.TeamID
            LEFT JOIN sportscategories sc ON t.SportCategoryID = sc.SportCategoryID
            WHERE tm.student_id = ?
            ORDER BY tm.JoinDate DESC
        ");
        $stmt->execute([$_GET['student_id']]);
        $teams = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        sendResponse(true, 'Student teams fetched successfully', $teams);
    }
    
    // POST - Add new team membership
    elseif ($_SERVER['REQUEST_METHOD'] == 'POST' && $action == 'add') {
        // Validate required fields
        if (empty($input['TeamID']) || empty($input['student_id'])) {
            sendResponse(false, 'Team ID and Student ID are required');
        }
        
        // Check if student is already a member of this team
        $check_stmt = $pdo->prepare("SELECT TeamMembershipID FROM teammemberships WHERE TeamID = ? AND student_id = ? AND Status = 'Active'");
        $check_stmt->execute([$input['TeamID'], $input['student_id']]);
        if ($check_stmt->fetch()) {
            sendResponse(false, 'Student is already an active member of this team');
        }
        
        // Check if jersey number is already taken
        if (!empty($input['JerseyNumber'])) {
            $check_jersey = $pdo->prepare("SELECT TeamMembershipID FROM teammemberships WHERE TeamID = ? AND JerseyNumber = ? AND Status = 'Active'");
            $check_jersey->execute([$input['TeamID'], $input['JerseyNumber']]);
            if ($check_jersey->fetch()) {
                sendResponse(false, 'Jersey number is already taken by another player');
            }
        }
        
        // Insert new membership
        $stmt = $pdo->prepare("
            INSERT INTO teammemberships (TeamID, student_id, Position, JerseyNumber, JoinDate, Status, CreatedBy) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $input['TeamID'],
            $input['student_id'],
            $input['Position'] ?? null,
            $input['JerseyNumber'] ?? null,
            $input['JoinDate'] ?? date('Y-m-d'),
            $input['Status'] ?? 'Active',
            $input['CreatedBy'] ?? null
        ]);
        
        $last_id = $pdo->lastInsertId();
        sendResponse(true, 'Team membership added successfully', ['TeamMembershipID' => $last_id]);
    }
    
    // POST - Update team membership
    elseif (($_SERVER['REQUEST_METHOD'] == 'PUT' || $_SERVER['REQUEST_METHOD'] == 'POST') && $action == 'update') {
        if (empty($input['TeamMembershipID'])) {
            sendResponse(false, 'TeamMembershipID is required for update');
        }
        
        // Check if membership exists
        $check_stmt = $pdo->prepare("SELECT TeamID FROM teammemberships WHERE TeamMembershipID = ?");
        $check_stmt->execute([$input['TeamMembershipID']]);
        $membership = $check_stmt->fetch(PDO::FETCH_ASSOC);
        if (!$membership) {
            sendResponse(false, 'Team membership not found');
        }
        
        // Check if jersey number is already taken (excluding current)
        if (!empty($input['JerseyNumber'])) {
            $check_jersey = $pdo->prepare("SELECT TeamMembershipID FROM teammemberships WHERE TeamID = ? AND JerseyNumber = ? AND TeamMembershipID != ? AND Status = 'Active'");
            $check_jersey->execute([$membership['TeamID'], $input['JerseyNumber'], $input['TeamMembershipID']]);
            if ($check_jersey->fetch()) {
                sendResponse(false, 'Jersey number is already taken by another player');
            }
        }
        
        $stmt = $pdo->prepare("
            UPDATE teammemberships 
            SET Position = ?, 
                JerseyNumber = ?, 
                JoinDate = ?, 
                EndDate = ?, 
                Status = ?, 
                ModifiedBy = ?,
                ModifiedOn = NOW()
            WHERE TeamMembershipID = ?
        ");
        $stmt->execute([
            $input['Position'] ?? null,
            $input['JerseyNumber'] ?? null,
            $input['JoinDate'] ?? null,
            $input['EndDate'] ?? null,
            $input['Status'] ?? 'Active',
            $input['ModifiedBy'] ?? null,
            $input['TeamMembershipID']
        ]);
        
        sendResponse(true, 'Team membership updated successfully');
    }
    
    // POST - Delete team membership
    elseif (($_SERVER['REQUEST_METHOD'] == 'DELETE' || $_SERVER['REQUEST_METHOD'] == 'POST') && $action == 'delete') {
        if (empty($input['TeamMembershipID'])) {
            sendResponse(false, 'TeamMembershipID is required for deletion');
        }
        
        $stmt = $pdo->prepare("DELETE FROM teammemberships WHERE TeamMembershipID = ?");
        $stmt->execute([$input['TeamMembershipID']]);
        
        sendResponse(true, 'Team membership deleted successfully');
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