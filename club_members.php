<?php
// club_members.php - Optimized PHP Backend API for Club Members Management

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Enable error reporting for debugging (disable in production)
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

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
    
    // Ensure left_members table exists for tracking departures
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS left_members (
            id INT AUTO_INCREMENT PRIMARY KEY,
            membership_id INT NOT NULL,
            student_name VARCHAR(255),
            club_id INT,
            club_name VARCHAR(255),
            reason TEXT,
            left_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ");
    
    $method = $_SERVER['REQUEST_METHOD'];
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    $action = $_GET['action'] ?? $input['action'] ?? '';

    // ==================== GET REQUESTS ====================
    if ($method == 'GET') {
        
        // GET - Get all memberships (for Admin ManageClubMembers screen)
        if ($action == 'get') {
            $stmt = $pdo->prepare("
                SELECT 
                    cm.membership_id,
                    cm.club_id,
                    cm.student_id,
                    cm.role,
                    cm.join_date,
                    cm.end_date,
                    cm.status,
                    cm.created_by,
                    cm.created_at,
                    cm.updated_at,
                    c.club_name,
                    u.user_name as student_name,
                    u.email as student_email,
                    u.phone as student_phone,
                    creator.user_name as created_by_name
                FROM club_members cm
                JOIN clubs c ON cm.club_id = c.club_id
                JOIN users u ON cm.student_id = u.user_id
                LEFT JOIN users creator ON cm.created_by = creator.user_id
                ORDER BY cm.join_date DESC
            ");
            $stmt->execute();
            $members = $stmt->fetchAll(PDO::FETCH_ASSOC);
            sendResponse(true, 'Members fetched successfully', $members);
        }
        
        // GET - Get members by club (OPTIMIZED - FASTER)
        elseif ($action == 'get_by_club' && isset($_GET['club_id'])) {
            $clubId = $_GET['club_id'];
            $stmt = $pdo->prepare("
                SELECT 
                    cm.membership_id,
                    cm.student_id,
                    cm.role,
                    cm.join_date,
                    u.user_name as student_name,
                    u.email as student_email
                FROM club_members cm
                JOIN users u ON cm.student_id = u.user_id
                WHERE cm.club_id = ? AND cm.status = 'active'
                ORDER BY u.user_name
            ");
            $stmt->execute([$clubId]);
            $members = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Sort by role priority in PHP (faster than MySQL FIELD)
            $priority = [
                'president' => 1,
                'vice_president' => 2,
                'secretary' => 3,
                'treasurer' => 4,
                'member' => 5
            ];
            
            usort($members, function($a, $b) use ($priority) {
                $roleA = $priority[$a['role']] ?? 5;
                $roleB = $priority[$b['role']] ?? 5;
                if ($roleA == $roleB) {
                    return strcmp($a['student_name'], $b['student_name']);
                }
                return $roleA - $roleB;
            });
            
            sendResponse(true, 'Club members fetched successfully', $members);
        }
        
        // GET - Get pending memberships (for admin approval)
        elseif ($action == 'get_pending' && isset($_GET['club_id'])) {
            $clubId = $_GET['club_id'];
            $stmt = $pdo->prepare("
                SELECT 
                    cm.membership_id,
                    cm.student_id,
                    cm.role,
                    cm.join_date,
                    u.user_name as student_name,
                    u.email as student_email
                FROM club_members cm
                JOIN users u ON cm.student_id = u.user_id
                WHERE cm.club_id = ? AND cm.status = 'pending'
                ORDER BY cm.join_date ASC
            ");
            $stmt->execute([$clubId]);
            $pending = $stmt->fetchAll(PDO::FETCH_ASSOC);
            sendResponse(true, 'Pending members fetched successfully', $pending);
        }
        
        // GET - Check if student is already a member
        elseif ($action == 'check_membership' && isset($_GET['club_id']) && isset($_GET['student_id'])) {
            $stmt = $pdo->prepare("
                SELECT membership_id, role, status, join_date 
                FROM club_members 
                WHERE club_id = ? AND student_id = ?
            ");
            $stmt->execute([$_GET['club_id'], $_GET['student_id']]);
            $membership = $stmt->fetch(PDO::FETCH_ASSOC);
            sendResponse(true, 'Membership status checked', $membership);
        }
        
        // GET - Get clubs by student - CHANGE 1: Include pending memberships
        elseif ($action == 'get_by_student' && isset($_GET['student_id'])) {
            $studentId = $_GET['student_id'];
            $stmt = $pdo->prepare("
                SELECT 
                    cm.membership_id,
                    cm.club_id,
                    cm.role,
                    cm.join_date,
                    cm.status,
                    c.club_name,
                    c.description,
                    c.meeting_schedule,
                    c.meeting_location
                FROM club_members cm
                JOIN clubs c ON cm.club_id = c.club_id
                WHERE cm.student_id = ? AND (cm.status = 'active' OR cm.status = 'pending')
                ORDER BY cm.join_date DESC
            ");
            $stmt->execute([$studentId]);
            $clubs = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            if (count($clubs) > 0) {
                error_log("First club data: " . json_encode($clubs[0]));
            }
            
            sendResponse(true, 'Student clubs fetched successfully', $clubs);
        }
        
        // ==================== NEW ENDPOINT ====================
        // GET - Get members who left (with reasons)
        elseif ($action == 'get_left_members') {
            $stmt = $pdo->prepare("
                SELECT 
                    lm.id,
                    lm.membership_id,
                    lm.student_name,
                    lm.club_id,
                    lm.club_name,
                    lm.reason,
                    lm.left_at,
                    c.club_name as current_club_name
                FROM left_members lm
                LEFT JOIN clubs c ON lm.club_id = c.club_id
                ORDER BY lm.left_at DESC
            ");
            $stmt->execute();
            $leftMembers = $stmt->fetchAll(PDO::FETCH_ASSOC);
            sendResponse(true, 'Left members fetched successfully', $leftMembers);
        }
        
        else {
            sendResponse(false, 'Invalid action. Available actions: get, get_by_club, get_pending, check_membership, get_by_student, get_left_members');
        }
    }
    
    // ==================== POST REQUESTS ====================
    elseif ($method == 'POST') {
        switch ($action) {
            
            // ADD new member (Admin/Teacher adding a member) - FIXED: Always 'active', never 'pending'
            case 'add':
                if (empty($input['club_id']) || empty($input['student_id'])) {
                    sendResponse(false, 'Club ID and Student ID are required');
                }
                
                // Check if already a member and handle reactivation
                $check = $pdo->prepare("SELECT membership_id, status FROM club_members WHERE club_id = ? AND student_id = ?");
                $check->execute([$input['club_id'], $input['student_id']]);
                $existing = $check->fetch();
                
                if ($existing) {
                    if ($existing['status'] == 'active') {
                        sendResponse(false, 'Student is already an active member of this club');
                    } elseif ($existing['status'] == 'pending') {
                        // CHANGE 2: Check for pending membership
                        sendResponse(false, 'Your membership request is still pending approval');
                    } elseif ($existing['status'] == 'inactive' || $existing['status'] == 'left') {
                        // Reactivate the existing member
                        $stmt = $pdo->prepare("
                            UPDATE club_members 
                            SET status = 'active', 
                                role = ?,
                                join_date = ?,
                                reason = NULL, 
                                left_at = NULL,
                                reviewed = 0
                            WHERE membership_id = ?
                        ");
                        $stmt->execute([
                            $input['role'] ?? 'member',
                            date('Y-m-d'),
                            $existing['membership_id']
                        ]);
                        sendResponse(true, 'Member reactivated successfully', ['membership_id' => $existing['membership_id']]);
                        break;
                    }
                }
                
                // Insert new member with EXPLICIT 'active' status (NOT pending)
                try {
                    $stmt = $pdo->prepare("
                        INSERT INTO club_members (club_id, student_id, role, join_date, status, created_by) 
                        VALUES (?, ?, ?, ?, 'active', ?)
                    ");
                    $stmt->execute([
                        $input['club_id'],
                        $input['student_id'],
                        $input['role'] ?? 'member',
                        date('Y-m-d'),
                        $input['created_by'] ?? null
                    ]);
                    
                    sendResponse(true, 'Member added successfully and is now active', ['membership_id' => $pdo->lastInsertId()]);
                } catch (PDOException $e) {
                    if ($e->getCode() == 23000) {
                        sendResponse(false, 'You have already requested to join this club');
                    } else {
                        sendResponse(false, 'Database error: ' . $e->getMessage());
                    }
                }
                break;
            
            // UPDATE member (Admin updating role/status)
            case 'update':
                if (empty($input['membership_id'])) {
                    sendResponse(false, 'Membership ID is required');
                }
                
                $stmt = $pdo->prepare("
                    UPDATE club_members 
                    SET role = ?, status = ? 
                    WHERE membership_id = ?
                ");
                $stmt->execute([
                    $input['role'] ?? 'member',
                    $input['status'] ?? 'active',
                    $input['membership_id']
                ]);
                sendResponse(true, 'Member updated successfully');
                break;
            
            // DELETE member (Admin/Teacher removing a member) - UPDATED with reason logging
            case 'delete':
                if (empty($input['membership_id'])) {
                    sendResponse(false, 'Membership ID is required');
                }
                
                // First, get member details for the left_members record
                $getDetails = $pdo->prepare("
                    SELECT 
                        cm.membership_id,
                        cm.student_id,
                        cm.club_id,
                        u.user_name as student_name,
                        c.club_name
                    FROM club_members cm
                    JOIN users u ON cm.student_id = u.user_id
                    JOIN clubs c ON cm.club_id = c.club_id
                    WHERE cm.membership_id = ?
                ");
                $getDetails->execute([$input['membership_id']]);
                $memberDetails = $getDetails->fetch(PDO::FETCH_ASSOC);
                
                if ($memberDetails) {
                    // Record leave reason before deleting
                    if (!empty($input['reason'])) {
                        $stmt = $pdo->prepare("
                            INSERT INTO left_members (membership_id, student_name, club_id, club_name, reason, left_at)
                            VALUES (?, ?, ?, ?, ?, NOW())
                        ");
                        $stmt->execute([
                            $input['membership_id'],
                            $memberDetails['student_name'] ?? 'Unknown',
                            $memberDetails['club_id'] ?? null,
                            $memberDetails['club_name'] ?? 'Unknown Club',
                            $input['reason']
                        ]);
                    } else {
                        // Record with default reason if none provided
                        $stmt = $pdo->prepare("
                            INSERT INTO left_members (membership_id, student_name, club_id, club_name, reason, left_at)
                            VALUES (?, ?, ?, ?, ?, NOW())
                        ");
                        $stmt->execute([
                            $input['membership_id'],
                            $memberDetails['student_name'] ?? 'Unknown',
                            $memberDetails['club_id'] ?? null,
                            $memberDetails['club_name'] ?? 'Unknown Club',
                            'Removed by admin'
                        ]);
                    }
                }
                
                // Now delete the member
                $stmt = $pdo->prepare("DELETE FROM club_members WHERE membership_id = ?");
                $stmt->execute([$input['membership_id']]);
                sendResponse(true, 'Member removed successfully with reason recorded');
                break;
            
            // Student joining a club - AUTO APPROVE (ACTIVE) - CHANGE 3: Added pending check and try-catch
            case 'join':
                if (empty($input['club_id']) || empty($input['student_id'])) {
                    sendResponse(false, 'Club ID and Student ID are required');
                }
                
                // Check if already a member
                $check = $pdo->prepare("SELECT membership_id, status FROM club_members WHERE club_id = ? AND student_id = ?");
                $check->execute([$input['club_id'], $input['student_id']]);
                $existing = $check->fetch();
                
                if ($existing) {
                    if ($existing['status'] == 'active') {
                        sendResponse(false, 'You are already a member of this club');
                    } elseif ($existing['status'] == 'pending') {
                        // CHANGE 3: Check for pending membership
                        sendResponse(false, 'Your membership request is still pending approval');
                    } elseif ($existing['status'] == 'inactive' || $existing['status'] == 'left') {
                        $stmt = $pdo->prepare("
                            UPDATE club_members 
                            SET status = 'active', 
                                join_date = ?, 
                                reason = NULL, 
                                left_at = NULL, 
                                reviewed = 0 
                            WHERE membership_id = ?
                        ");
                        $stmt->execute([date('Y-m-d'), $existing['membership_id']]);
                        sendResponse(true, 'You have rejoined the club!', ['membership_id' => $existing['membership_id']]);
                        break;
                    }
                }
                
                // Insert new member - wrapped in try-catch for duplicate handling (CHANGE 3)
                try {
                    $stmt = $pdo->prepare("
                        INSERT INTO club_members (club_id, student_id, role, join_date, status) 
                        VALUES (?, ?, 'member', ?, 'active')
                    ");
                    $stmt->execute([
                        $input['club_id'],
                        $input['student_id'],
                        date('Y-m-d')
                    ]);
                    
                    sendResponse(true, 'You have successfully joined the club!', ['membership_id' => $pdo->lastInsertId()]);
                } catch (PDOException $e) {
                    if ($e->getCode() == 23000) {
                        sendResponse(false, 'You have already requested to join this club');
                    } else {
                        sendResponse(false, 'Database error: ' . $e->getMessage());
                    }
                }
                break;
            
            // ==================== UPDATED LEAVE HANDLER ====================
            // Leave a club with reason
            case 'leave':
                if (empty($input['membership_id'])) {
                    sendResponse(false, 'Membership ID is required');
                }
                
                // Get member details for left_members table
                $getDetails = $pdo->prepare("
                    SELECT 
                        cm.membership_id,
                        cm.student_id,
                        cm.club_id,
                        u.user_name as student_name,
                        c.club_name
                    FROM club_members cm
                    JOIN users u ON cm.student_id = u.user_id
                    JOIN clubs c ON cm.club_id = c.club_id
                    WHERE cm.membership_id = ?
                ");
                $getDetails->execute([$input['membership_id']]);
                $memberDetails = $getDetails->fetch(PDO::FETCH_ASSOC);
                
                if ($memberDetails) {
                    // Record leave reason before updating
                    if (!empty($input['reason'])) {
                        $stmt = $pdo->prepare("
                            INSERT INTO left_members (membership_id, student_name, club_id, club_name, reason, left_at)
                            VALUES (?, ?, ?, ?, ?, NOW())
                        ");
                        $stmt->execute([
                            $input['membership_id'],
                            $memberDetails['student_name'] ?? 'Unknown',
                            $memberDetails['club_id'] ?? null,
                            $memberDetails['club_name'] ?? 'Unknown Club',
                            $input['reason']
                        ]);
                    }
                }
                
                // Update the membership status
                $stmt = $pdo->prepare("
                    UPDATE club_members 
                    SET status = 'left', 
                        reason = ?, 
                        left_at = NOW(),
                        reviewed = 0
                    WHERE membership_id = ?
                ");
                $stmt->execute([
                    $input['reason'] ?? null,
                    $input['membership_id']
                ]);
                sendResponse(true, 'You have left the club successfully. Your reason has been recorded.');
                break;
            
            // ==================== NEW ENDPOINT ====================
            // Acknowledge/Review a leave reason (Admin marks as reviewed)
            case 'acknowledge_leave':
                if (empty($input['membership_id'])) {
                    sendResponse(false, 'Membership ID is required');
                }
                
                $stmt = $pdo->prepare("
                    UPDATE club_members 
                    SET reviewed = 1 
                    WHERE membership_id = ?
                ");
                $stmt->execute([$input['membership_id']]);
                sendResponse(true, 'Leave reason marked as reviewed');
                break;
            
            // Admin approving a member (kept for backwards compatibility)
            case 'approve':
                if (empty($input['membership_id'])) {
                    sendResponse(false, 'Membership ID is required');
                }
                
                $stmt = $pdo->prepare("UPDATE club_members SET status = 'active' WHERE membership_id = ?");
                $stmt->execute([$input['membership_id']]);
                sendResponse(true, 'Member approved successfully');
                break;
            
            // Admin rejecting a member
            case 'reject':
                if (empty($input['membership_id'])) {
                    sendResponse(false, 'Membership ID is required');
                }
                
                $stmt = $pdo->prepare("DELETE FROM club_members WHERE membership_id = ?");
                $stmt->execute([$input['membership_id']]);
                sendResponse(true, 'Member request rejected');
                break;
            
            // Update member role
            case 'update_role':
                if (empty($input['membership_id']) || empty($input['role'])) {
                    sendResponse(false, 'Membership ID and Role are required');
                }
                
                $allowedRoles = ['member', 'vice_president', 'president', 'secretary', 'treasurer'];
                if (!in_array($input['role'], $allowedRoles)) {
                    sendResponse(false, 'Invalid role. Allowed: member, vice_president, president, secretary, treasurer');
                }
                
                $stmt = $pdo->prepare("UPDATE club_members SET role = ? WHERE membership_id = ?");
                $stmt->execute([$input['role'], $input['membership_id']]);
                sendResponse(true, 'Member role updated successfully');
                break;
                
            default:
                sendResponse(false, 'Invalid action. Available actions: add, update, delete, join, leave, approve, reject, update_role, acknowledge_leave');
        }
    }
    
    else {
        sendResponse(false, 'Method not supported. Use GET or POST');
    }
    
} catch (PDOException $e) {
    error_log("Database error: " . $e->getMessage());
    sendResponse(false, 'Database error: ' . $e->getMessage());
} catch (Exception $e) {
    error_log("General error: " . $e->getMessage());
    sendResponse(false, 'Server error: ' . $e->getMessage());
}
?>