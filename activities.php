<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$host = 'localhost';
$dbname = 'cam';
$username = 'root';
$password = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database connection failed: ' . $e->getMessage()]);
    exit();
}

$method = $_SERVER['REQUEST_METHOD'];
$action = isset($_GET['action']) ? $_GET['action'] : (isset($_POST['action']) ? $_POST['action'] : '');

$input = json_decode(file_get_contents('php://input'), true);
if ($input && isset($input['action'])) {
    $action = $input['action'];
}

try {
    switch ($action) {
        case 'get':
            handleGet($pdo);
            break;
        case 'get_pending':
            handleGetPending($pdo);
            break;
        case 'get_published':
            handleGetPublished($pdo);
            break;
        case 'get_by_club':
            handleGetByClub($pdo);
            break;
        case 'add':
            handleAdd($pdo, $input);
            break;
        case 'update':
            handleUpdate($pdo, $input);
            break;
        case 'delete':
            handleDelete($pdo, $input);
            break;
        case 'approve':
            handleApprove($pdo, $input);
            break;
        case 'reject':
            handleReject($pdo, $input);
            break;
        case 'reply_rejection':
            handleReplyRejection($pdo, $input);
            break;
        case 'admin_reply':
            handleAdminReply($pdo, $input);
            break;
        case 'get_rejected_replies':
            handleGetRejectedReplies($pdo, $input);
            break;
        default:
            echo json_encode(['success' => false, 'message' => 'Invalid action or method', 'data' => null]);
            break;
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
}

function handleGet($pdo) {
    $stmt = $pdo->query("
        SELECT a.*, c.club_name 
        FROM activities a 
        LEFT JOIN clubs c ON a.club_id = c.club_id 
        ORDER BY a.CreatedOn DESC
    ");
    $activities = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode(['success' => true, 'message' => 'Activities fetched successfully', 'data' => $activities]);
}

function handleGetPending($pdo) {
    $stmt = $pdo->query("
        SELECT a.*, c.club_name 
        FROM activities a 
        LEFT JOIN clubs c ON a.club_id = c.club_id 
        WHERE a.Status IN ('Pending', 'Draft') 
        ORDER BY a.CreatedOn DESC
    ");
    $activities = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode(['success' => true, 'message' => 'Pending activities fetched successfully', 'data' => $activities]);
}

function handleGetPublished($pdo) {
    $stmt = $pdo->query("
        SELECT a.*, c.club_name 
        FROM activities a 
        LEFT JOIN clubs c ON a.club_id = c.club_id 
        WHERE a.Status = 'Approved' 
        ORDER BY a.CreatedOn DESC
    ");
    $activities = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode(['success' => true, 'message' => 'Published activities fetched successfully', 'data' => $activities]);
}

function handleGetByClub($pdo) {
    $club_id = isset($_GET['club_id']) ? $_GET['club_id'] : null;
    if (!$club_id) {
        echo json_encode(['success' => false, 'message' => 'Club ID is required']);
        return;
    }
    $stmt = $pdo->prepare("
        SELECT a.*, c.club_name 
        FROM activities a 
        LEFT JOIN clubs c ON a.club_id = c.club_id 
        WHERE a.club_id = ? 
        ORDER BY a.CreatedOn DESC
    ");
    $stmt->execute([$club_id]);
    $activities = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode(['success' => true, 'message' => 'Activities fetched successfully', 'data' => $activities]);
}

function handleAdd($pdo, $input) {
    $sql = "INSERT INTO activities (club_id, ActivityName, Description, ActivityType, StartDateTime, EndDateTime, Location, MaxParticipants, RegistrationDeadline, RequiresApproval, Status, Budget, CreatedBy, CreatedOn, ModifiedOn) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        $input['club_id'] ?? null,
        $input['ActivityName'] ?? '',
        $input['Description'] ?? '',
        $input['ActivityType'] ?? 'Other',
        $input['StartDateTime'] ?? null,
        $input['EndDateTime'] ?? null,
        $input['Location'] ?? '',
        $input['MaxParticipants'] ?? 0,
        $input['RegistrationDeadline'] ?? null,
        $input['RequiresApproval'] ?? 0,
        $input['Status'] ?? 'Pending',
        $input['Budget'] ?? 0,
        $input['CreatedBy'] ?? null
    ]);
    
    $activityId = $pdo->lastInsertId();
    
    echo json_encode(['success' => true, 'message' => 'Activity added successfully', 'data' => ['ActivityID' => $activityId]]);
}

function handleUpdate($pdo, $input) {
    // IMPROVED: Added RejectionReason to the update query
    $sql = "UPDATE activities SET 
                club_id = ?, 
                ActivityName = ?, 
                Description = ?, 
                ActivityType = ?, 
                StartDateTime = ?, 
                EndDateTime = ?, 
                Location = ?, 
                MaxParticipants = ?, 
                RegistrationDeadline = ?, 
                RequiresApproval = ?, 
                Status = ?, 
                Budget = ?,
                RejectionReason = ?,
                ModifiedBy = ?, 
                ModifiedOn = NOW() 
            WHERE ActivityID = ?";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        $input['club_id'] ?? null,
        $input['ActivityName'] ?? '',
        $input['Description'] ?? '',
        $input['ActivityType'] ?? 'Other',
        $input['StartDateTime'] ?? null,
        $input['EndDateTime'] ?? null,
        $input['Location'] ?? '',
        $input['MaxParticipants'] ?? 0,
        $input['RegistrationDeadline'] ?? null,
        $input['RequiresApproval'] ?? 0,
        $input['Status'] ?? 'Pending',
        $input['Budget'] ?? 0,
        $input['RejectionReason'] ?? null,  // ← Added this line
        $input['ModifiedBy'] ?? null,
        $input['ActivityID'] ?? null
    ]);
    
    echo json_encode(['success' => true, 'message' => 'Activity updated successfully']);
}

function handleDelete($pdo, $input) {
    $activityId = $input['ActivityID'] ?? null;
    if (!$activityId) {
        echo json_encode(['success' => false, 'message' => 'Activity ID is required']);
        return;
    }
    
    $stmt = $pdo->prepare("DELETE FROM activities WHERE ActivityID = ?");
    $stmt->execute([$activityId]);
    
    echo json_encode(['success' => true, 'message' => 'Activity deleted successfully']);
}

function handleApprove($pdo, $input) {
    $activityId = $input['ActivityID'] ?? null;
    if (!$activityId) {
        echo json_encode(['success' => false, 'message' => 'Activity ID is required']);
        return;
    }
    
    $stmt = $pdo->prepare("UPDATE activities SET Status = 'Approved', ModifiedOn = NOW() WHERE ActivityID = ?");
    $stmt->execute([$activityId]);
    
    echo json_encode(['success' => true, 'message' => 'Activity approved successfully']);
}

function handleReject($pdo, $input) {
    $activityId = $input['ActivityID'] ?? null;
    $reason = $input['RejectionReason'] ?? '';
    
    if (!$activityId) {
        echo json_encode(['success' => false, 'message' => 'Activity ID is required']);
        return;
    }
    
    $stmt = $pdo->prepare("UPDATE activities SET Status = 'Rejected', RejectionReason = ?, ModifiedOn = NOW() WHERE ActivityID = ?");
    $stmt->execute([$reason, $activityId]);
    
    echo json_encode(['success' => true, 'message' => 'Activity rejected successfully']);
}

function handleReplyRejection($pdo, $input) {
    $activityId = $input['ActivityID'] ?? null;
    $reply = $input['RejectionReply'] ?? '';
    
    if (!$activityId) {
        echo json_encode(['success' => false, 'message' => 'Activity ID is required']);
        return;
    }
    
    $stmt = $pdo->prepare("UPDATE activities SET RejectionReply = ?, ModifiedOn = NOW() WHERE ActivityID = ?");
    $stmt->execute([$reply, $activityId]);
    
    echo json_encode(['success' => true, 'message' => 'Reply submitted successfully']);
}

function handleAdminReply($pdo, $input) {
    $activityId = $input['ActivityID'] ?? null;
    $reply = $input['AdminReply'] ?? '';
    
    if (!$activityId) {
        echo json_encode(['success' => false, 'message' => 'Activity ID is required']);
        return;
    }
    
    $stmt = $pdo->prepare("UPDATE activities SET AdminReply = ?, ModifiedOn = NOW() WHERE ActivityID = ?");
    $stmt->execute([$reply, $activityId]);
    
    echo json_encode(['success' => true, 'message' => 'Admin reply submitted successfully']);
}

function handleGetRejectedReplies($pdo, $input) {
    $activityId = $input['ActivityID'] ?? null;
    if (!$activityId) {
        echo json_encode(['success' => false, 'message' => 'Activity ID is required']);
        return;
    }
    
    $stmt = $pdo->prepare("SELECT RejectionReason, RejectionReply, AdminReply FROM activities WHERE ActivityID = ?");
    $stmt->execute([$activityId]);
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    
    echo json_encode(['success' => true, 'data' => $result]);
}
?>