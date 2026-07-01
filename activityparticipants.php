<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') exit(0);

$host = 'localhost'; 
$dbname = 'cam'; 
$username = 'root'; 
$password = '';

function sendResponse($success, $message, $data = null) {
    echo json_encode(['success' => $success, 'message' => $message, 'data' => $data]);
    exit;
}

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    $action = $_GET['action'] ?? $input['action'] ?? '';

    // GET - Fetch all participants
    if ($_SERVER['REQUEST_METHOD'] == 'GET' && $action == 'get') {
        $stmt = $pdo->prepare("
            SELECT 
                ap.ParticipationID,
                ap.ActivityID,
                ap.student_id,
                ap.AttendanceStatus,
                ap.Notes,
                ap.RegistrationDate,
                a.ActivityName,
                u.user_name as student_name,
                u.email
            FROM activityparticipants ap
            JOIN activities a ON ap.ActivityID = a.ActivityID
            JOIN users u ON ap.student_id = u.user_id
            ORDER BY ap.RegistrationDate DESC
        ");
        $stmt->execute();
        $participants = $stmt->fetchAll(PDO::FETCH_ASSOC);
        sendResponse(true, 'Participants fetched successfully', $participants);
    }
    
    // GET - Fetch participants by activity
    elseif ($_SERVER['REQUEST_METHOD'] == 'GET' && $action == 'get_by_activity' && isset($_GET['activity_id'])) {
        $stmt = $pdo->prepare("
            SELECT 
                ap.ParticipationID,
                ap.ActivityID,
                ap.student_id,
                ap.AttendanceStatus,
                ap.RegistrationDate,
                u.user_name as student_name,
                u.email as student_email
            FROM activityparticipants ap
            JOIN users u ON ap.student_id = u.user_id
            WHERE ap.ActivityID = ?
            ORDER BY ap.RegistrationDate DESC
        ");
        $stmt->execute([$_GET['activity_id']]);
        $participants = $stmt->fetchAll(PDO::FETCH_ASSOC);
        sendResponse(true, 'Participants fetched successfully', $participants);
    }
    
    // GET - Fetch count
    elseif ($_SERVER['REQUEST_METHOD'] == 'GET' && $action == 'get_count') {
        $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM activityparticipants");
        $stmt->execute();
        $count = $stmt->fetch(PDO::FETCH_ASSOC);
        sendResponse(true, 'Count fetched', ['count' => $count['count']]);
    }
    
    // POST - Add participant (USING CORRECT COLUMN NAME: student_id)
    elseif ($_SERVER['REQUEST_METHOD'] == 'POST' && $action == 'add') {
        if (empty($input['ActivityID']) || empty($input['StudentID'])) {
            sendResponse(false, 'ActivityID and StudentID are required');
        }
        
        // Check if already registered
        $checkStmt = $pdo->prepare("SELECT COUNT(*) FROM activityparticipants WHERE ActivityID = ? AND student_id = ?");
        $checkStmt->execute([$input['ActivityID'], $input['StudentID']]);
        $exists = $checkStmt->fetchColumn();
        
        if ($exists > 0) {
            sendResponse(false, 'Student already registered for this activity');
        }
        
        // Check if activity has reached max participants
        $activityStmt = $pdo->prepare("SELECT MaxParticipants FROM activities WHERE ActivityID = ?");
        $activityStmt->execute([$input['ActivityID']]);
        $activity = $activityStmt->fetch(PDO::FETCH_ASSOC);
        
        if ($activity && $activity['MaxParticipants'] > 0) {
            $countStmt = $pdo->prepare("SELECT COUNT(*) FROM activityparticipants WHERE ActivityID = ?");
            $countStmt->execute([$input['ActivityID']]);
            $currentCount = $countStmt->fetchColumn();
            
            if ($currentCount >= $activity['MaxParticipants']) {
                sendResponse(false, 'Activity has reached maximum participants');
            }
        }
        
        // Using correct column name: student_id (not StudentID)
        $stmt = $pdo->prepare("
            INSERT INTO activityparticipants (ActivityID, student_id, AttendanceStatus, Notes, RegistrationDate) 
            VALUES (?, ?, ?, ?, NOW())
        ");
        $stmt->execute([
            $input['ActivityID'], 
            $input['StudentID'],  // Frontend sends StudentID, but we map to student_id column
            $input['AttendanceStatus'] ?? 'Registered', 
            $input['Notes'] ?? null
        ]);
        
        sendResponse(true, 'Participant added successfully', ['ParticipationID' => $pdo->lastInsertId()]);
    }
    
    // POST - Update participant
    elseif (($_SERVER['REQUEST_METHOD'] == 'POST') && $action == 'update') {
        if (empty($input['ParticipationID'])) {
            sendResponse(false, 'ParticipationID is required');
        }
        
        $stmt = $pdo->prepare("
            UPDATE activityparticipants 
            SET AttendanceStatus = ?, Notes = ? 
            WHERE ParticipationID = ?
        ");
        $stmt->execute([
            $input['AttendanceStatus'], 
            $input['Notes'] ?? null, 
            $input['ParticipationID']
        ]);
        
        sendResponse(true, 'Participant updated successfully');
    }
    
    // POST - Update attendance
    elseif ($_SERVER['REQUEST_METHOD'] == 'POST' && $action == 'update_attendance') {
        if (empty($input['participation_id']) || empty($input['attendance_status'])) {
            sendResponse(false, 'Participation ID and attendance status required');
        }
        
        $stmt = $pdo->prepare("UPDATE activityparticipants SET AttendanceStatus = ? WHERE ParticipationID = ?");
        $stmt->execute([$input['attendance_status'], $input['participation_id']]);
        sendResponse(true, 'Attendance updated successfully');
    }
    
    // POST - Delete participant
    elseif (($_SERVER['REQUEST_METHOD'] == 'POST') && $action == 'delete') {
        if (empty($input['ParticipationID'])) {
            sendResponse(false, 'ParticipationID is required');
        }
        
        $stmt = $pdo->prepare("DELETE FROM activityparticipants WHERE ParticipationID = ?");
        $stmt->execute([$input['ParticipationID']]);
        
        sendResponse(true, 'Participant deleted successfully');
    }
    
    else {
        sendResponse(false, 'Invalid action');
    }
    
} catch (PDOException $e) { 
    error_log("Database Error: " . $e->getMessage());
    sendResponse(false, 'Database error: ' . $e->getMessage()); 
}
?>