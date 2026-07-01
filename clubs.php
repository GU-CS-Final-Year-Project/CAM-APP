<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

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

    // GET all clubs (with member count)
    if ($_SERVER['REQUEST_METHOD'] == 'GET' && $action == 'get') {
        $stmt = $pdo->prepare("
            SELECT c.*, cat.category_name,
                (SELECT COUNT(*) FROM club_members cm WHERE cm.club_id = c.club_id) AS member_count
            FROM clubs c
            LEFT JOIN club_categories cat ON c.category_id = cat.category_id
            ORDER BY c.club_name ASC
        ");
        $stmt->execute();
        sendResponse(true, 'Clubs fetched successfully', $stmt->fetchAll(PDO::FETCH_ASSOC));
    }
    
    // GET pending clubs (for admin approval)
    elseif ($_SERVER['REQUEST_METHOD'] == 'GET' && $action == 'get_pending_clubs') {
        $stmt = $pdo->prepare("
            SELECT c.*, cat.category_name, u.user_name as created_by_name
            FROM clubs c
            LEFT JOIN club_categories cat ON c.category_id = cat.category_id
            LEFT JOIN users u ON c.created_by = u.user_id
            WHERE c.Status = 'Pending'
            ORDER BY c.created_at DESC
        ");
        $stmt->execute();
        sendResponse(true, 'Pending clubs fetched successfully', $stmt->fetchAll(PDO::FETCH_ASSOC));
    }
    
    // GET rejected clubs with replies (for admin to see leader responses)
    elseif ($_SERVER['REQUEST_METHOD'] == 'GET' && $action == 'get_rejected_replies') {
        $stmt = $pdo->prepare("
            SELECT c.*, cat.category_name, u.user_name as created_by_name
            FROM clubs c
            LEFT JOIN club_categories cat ON c.category_id = cat.category_id
            LEFT JOIN users u ON c.created_by = u.user_id
            WHERE c.Status = 'rejected' AND c.RejectionReply IS NOT NULL
            ORDER BY c.updated_at DESC
        ");
        $stmt->execute();
        sendResponse(true, 'Rejected clubs with replies fetched successfully', $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    // GET single club
    elseif ($_SERVER['REQUEST_METHOD'] == 'GET' && $action == 'get_club' && isset($_GET['club_id'])) {
        $stmt = $pdo->prepare("
            SELECT c.*, cat.category_name,
                (SELECT COUNT(*) FROM club_members cm WHERE cm.club_id = c.club_id) AS member_count
            FROM clubs c
            LEFT JOIN club_categories cat ON c.category_id = cat.category_id
            WHERE c.club_id = ?
        ");
        $stmt->execute([$_GET['club_id']]);
        $club = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($club) {
            sendResponse(true, 'Club fetched successfully', $club);
        } else {
            sendResponse(false, 'Club not found');
        }
    }
    
    // POST - Add club
    elseif ($_SERVER['REQUEST_METHOD'] == 'POST' && $action == 'add') {
        $club_name = $input['club_name'] ?? null;
        $description = $input['description'] ?? null;
        $category_id = $input['category_id'] ?? null;
        $patron = $input['patron'] ?? null;
        $meeting_schedule = $input['meeting_schedule'] ?? null;
        $meeting_location = $input['meeting_location'] ?? null;
        $created_by = $input['created_by'] ?? null;
        $user_type = $input['user_type'] ?? '';
        
        if (empty($club_name)) {
            sendResponse(false, 'Club name is required');
        }
        if (empty($description)) {
            sendResponse(false, 'Description is required');
        }
        
        $status = ($user_type === 'Admin') ? 'approved' : 'draft';
        
        $stmt = $pdo->prepare("
            INSERT INTO clubs (club_name, description, category_id, patron, meeting_schedule, meeting_location, created_by, Status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ");
        $stmt->execute([
            $club_name,
            $description,
            $category_id,
            $patron,
            $meeting_schedule,
            $meeting_location,
            $created_by,
            $status
        ]);
        
        $club_id = $pdo->lastInsertId();
        $message = ($status === 'draft') ? 'Club created as draft. Submit for approval when ready.' : 'Club created successfully.';
        sendResponse(true, $message, ['club_id' => $club_id]);
    }
    
    // POST - Reply to rejection
    elseif ($_SERVER['REQUEST_METHOD'] == 'POST' && $action == 'reply_rejection') {
        if (empty($input['club_id']) || empty($input['reply'])) {
            sendResponse(false, 'Club ID and reply are required');
        }
        
        $stmt = $pdo->prepare("UPDATE clubs SET RejectionReply = ?, updated_at = NOW() WHERE club_id = ?");
        $stmt->execute([$input['reply'], $input['club_id']]);
        
        sendResponse(true, 'Reply sent successfully');
    }

    // POST - Admin reply to club leader's rejection reply
    elseif ($_SERVER['REQUEST_METHOD'] == 'POST' && $action == 'admin_reply') {
        if (empty($input['club_id']) || empty($input['reply'])) {
            sendResponse(false, 'Club ID and reply are required');
        }

        $stmt = $pdo->prepare("UPDATE clubs SET AdminReply = ?, updated_at = NOW() WHERE club_id = ?");
        $stmt->execute([$input['reply'], $input['club_id']]);

        sendResponse(true, 'Reply sent to club leader successfully');
    }
    
    // POST - Request club approval (Draft/Rejected -> Pending)
    elseif ($_SERVER['REQUEST_METHOD'] == 'POST' && $action == 'request_club_approval') {
        if (empty($input['club_id'])) {
            sendResponse(false, 'Club ID is required');
        }
        
        $checkStmt = $pdo->prepare("SELECT club_id, Status FROM clubs WHERE club_id = ?");
        $checkStmt->execute([$input['club_id']]);
        $club = $checkStmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$club) {
            sendResponse(false, 'Club not found');
        }
        
        if ($club['Status'] !== 'draft' && $club['Status'] !== 'rejected') {
            sendResponse(false, 'Only draft or rejected clubs can be submitted for approval. Current status: ' . $club['Status']);
        }
        
        $stmt = $pdo->prepare("UPDATE clubs SET Status = 'Pending', AdminReply = NULL, updated_at = NOW() WHERE club_id = ?");
        $stmt->execute([$input['club_id']]);
        
        sendResponse(true, 'Club submitted for approval successfully');
    }
    
    // POST - Approve club (Admin action)
    elseif ($_SERVER['REQUEST_METHOD'] == 'POST' && $action == 'approve_club') {
        if (empty($input['club_id'])) {
            sendResponse(false, 'Club ID is required');
        }
        
        $stmt = $pdo->prepare("UPDATE clubs SET Status = 'approved', updated_at = NOW() WHERE club_id = ?");
        $stmt->execute([$input['club_id']]);
        
        sendResponse(true, 'Club approved successfully');
    }
    
    // POST - Reject club (Admin action)
    elseif ($_SERVER['REQUEST_METHOD'] == 'POST' && $action == 'reject_club') {
        if (empty($input['club_id'])) {
            sendResponse(false, 'Club ID is required');
        }
        
        $reason = $input['rejection_reason'] ?? 'No reason provided';
        
        $stmt = $pdo->prepare("UPDATE clubs SET Status = 'rejected', RejectionReason = ?, RejectionReply = NULL, AdminReply = NULL, updated_at = NOW() WHERE club_id = ?");
        $stmt->execute([$reason, $input['club_id']]);
        
        sendResponse(true, 'Club rejected successfully');
    }
    
    // POST - Update club
    elseif (($_SERVER['REQUEST_METHOD'] == 'PUT' || $_SERVER['REQUEST_METHOD'] == 'POST') && $action == 'update') {
        if (empty($input['club_id'])) {
            sendResponse(false, 'Club ID required');
        }
        
        $checkStmt = $pdo->prepare("SELECT Status FROM clubs WHERE club_id = ?");
        $checkStmt->execute([$input['club_id']]);
        $club = $checkStmt->fetch(PDO::FETCH_ASSOC);
        
        if ($club && $club['Status'] !== 'draft' && $club['Status'] !== 'rejected') {
            sendResponse(false, 'Only draft or rejected clubs can be edited. Current status: ' . $club['Status']);
        }
        
        $stmt = $pdo->prepare("
            UPDATE clubs 
            SET club_name = ?,
                description = ?,
                category_id = ?,
                patron = ?,
                meeting_schedule = ?,
                meeting_location = ?,
                updated_at = NOW()
            WHERE club_id = ?
        ");
        $stmt->execute([
            $input['club_name'] ?? null,
            $input['description'] ?? null,
            $input['category_id'] ?? null,
            $input['patron'] ?? null,
            $input['meeting_schedule'] ?? null,
            $input['meeting_location'] ?? null,
            $input['club_id']
        ]);
        
        sendResponse(true, 'Club updated successfully');
    }
    
    // POST - Delete club
    elseif (($_SERVER['REQUEST_METHOD'] == 'DELETE' || $_SERVER['REQUEST_METHOD'] == 'POST') && $action == 'delete') {
        if (empty($input['club_id'])) {
            sendResponse(false, 'Club ID required');
        }
        
        try {
            $deleteMembers = $pdo->prepare("DELETE FROM club_members WHERE club_id = ?");
            $deleteMembers->execute([$input['club_id']]);
        } catch (PDOException $e) {
        }
        
        $stmt = $pdo->prepare("DELETE FROM clubs WHERE club_id = ?");
        $stmt->execute([$input['club_id']]);
        
        sendResponse(true, 'Club and associated members deleted successfully');
    }
    
    else {
        sendResponse(false, 'Invalid action or method');
    }
    
} catch (PDOException $e) {
    error_log("Database Error: " . $e->getMessage());
    sendResponse(false, 'Database error: ' . $e->getMessage());
} catch (Exception $e) {
    error_log("Server Error: " . $e->getMessage());
    sendResponse(false, 'Server error: ' . $e->getMessage());
}
?>