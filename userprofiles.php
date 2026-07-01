<?php
// userprofiles.php - PHP Backend API for User Profiles Management

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
    
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    $action = $_GET['action'] ?? $input['action'] ?? '';

    // GET - Fetch all user profiles with user info
    if ($_SERVER['REQUEST_METHOD'] == 'GET' && $action == 'get') {
        $stmt = $pdo->prepare("
            SELECT 
                p.profile_id,
                p.user_id,
                p.gender,
                p.date_of_birth,
                p.contact,
                p.address,
                p.profile_picture,
                p.created_at,
                p.updated_at,
                u.user_name,
                u.email,
                u.phone as user_phone,
                u.user_type
            FROM userprofiles p
            JOIN users u ON p.user_id = u.user_id
            ORDER BY p.created_at DESC
        ");
        $stmt->execute();
        $profiles = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        sendResponse(true, 'User profiles fetched successfully', $profiles);
    }
    
    // GET single profile by user_id
    elseif ($_SERVER['REQUEST_METHOD'] == 'GET' && $action == 'get_by_user' && isset($_GET['user_id'])) {
        $stmt = $pdo->prepare("
            SELECT 
                p.*,
                u.user_name,
                u.email,
                u.phone as user_phone,
                u.user_type
            FROM userprofiles p
            JOIN users u ON p.user_id = u.user_id
            WHERE p.user_id = ?
        ");
        $stmt->execute([$_GET['user_id']]);
        $profile = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($profile) {
            sendResponse(true, 'User profile fetched successfully', $profile);
        } else {
            sendResponse(false, 'Profile not found for this user');
        }
    }
    
    // POST - Create new user profile
    elseif ($_SERVER['REQUEST_METHOD'] == 'POST' && $action == 'add') {
        $required_fields = ['user_id'];
        $missing_fields = [];
        
        foreach ($required_fields as $field) {
            if (empty($input[$field])) {
                $missing_fields[] = $field;
            }
        }
        
        if (!empty($missing_fields)) {
            sendResponse(false, 'Missing required fields: ' . implode(', ', $missing_fields));
        }
        
        // Check if profile already exists for this user
        $check_stmt = $pdo->prepare("SELECT profile_id FROM userprofiles WHERE user_id = ?");
        $check_stmt->execute([$input['user_id']]);
        if ($check_stmt->fetch()) {
            sendResponse(false, 'Profile already exists for this user');
        }
        
        // Validate date format if provided
        if (!empty($input['date_of_birth']) && !DateTime::createFromFormat('Y-m-d', $input['date_of_birth'])) {
            sendResponse(false, 'Invalid date format. Use YYYY-MM-DD');
        }
        
        $stmt = $pdo->prepare("
            INSERT INTO userprofiles (user_id, gender, date_of_birth, contact, address, profile_picture) 
            VALUES (?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $input['user_id'],
            $input['gender'] ?? null,
            $input['date_of_birth'] ?? null,
            $input['contact'] ?? null,
            $input['address'] ?? null,
            $input['profile_picture'] ?? null
        ]);
        
        $last_id = $pdo->lastInsertId();
        
        // Fetch the created profile
        $fetch_stmt = $pdo->prepare("
            SELECT p.*, u.user_name, u.email, u.user_type 
            FROM userprofiles p
            JOIN users u ON p.user_id = u.user_id
            WHERE p.profile_id = ?
        ");
        $fetch_stmt->execute([$last_id]);
        $profile = $fetch_stmt->fetch(PDO::FETCH_ASSOC);
        
        sendResponse(true, 'User profile created successfully', $profile);
    }
    
    // PUT/POST - Update user profile
    elseif (($_SERVER['REQUEST_METHOD'] == 'PUT' || $_SERVER['REQUEST_METHOD'] == 'POST') && $action == 'update') {
        if (empty($input['profile_id'])) {
            sendResponse(false, 'Profile ID is required for update');
        }
        
        // Check if profile exists
        $check_stmt = $pdo->prepare("SELECT profile_id FROM userprofiles WHERE profile_id = ?");
        $check_stmt->execute([$input['profile_id']]);
        if (!$check_stmt->fetch()) {
            sendResponse(false, 'Profile not found');
        }
        
        // Validate date format if provided
        if (!empty($input['date_of_birth']) && !DateTime::createFromFormat('Y-m-d', $input['date_of_birth'])) {
            sendResponse(false, 'Invalid date format. Use YYYY-MM-DD');
        }
        
        $update_fields = [];
        $params = [];
        
        $allowed_fields = ['gender', 'date_of_birth', 'contact', 'address', 'profile_picture'];
        
        foreach ($allowed_fields as $field) {
            if (isset($input[$field])) {
                $update_fields[] = "$field = ?";
                $params[] = $input[$field];
            }
        }
        
        if (empty($update_fields)) {
            sendResponse(false, 'No fields to update');
        }
        
        $params[] = $input['profile_id'];
        $sql = "UPDATE userprofiles SET " . implode(', ', $update_fields) . ", updated_at = NOW() WHERE profile_id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        
        // Fetch updated profile
        $fetch_stmt = $pdo->prepare("
            SELECT p.*, u.user_name, u.email, u.user_type 
            FROM userprofiles p
            JOIN users u ON p.user_id = u.user_id
            WHERE p.profile_id = ?
        ");
        $fetch_stmt->execute([$input['profile_id']]);
        $profile = $fetch_stmt->fetch(PDO::FETCH_ASSOC);
        
        sendResponse(true, 'User profile updated successfully', $profile);
    }
    
    // DELETE - Delete user profile
    elseif (($_SERVER['REQUEST_METHOD'] == 'DELETE' || $_SERVER['REQUEST_METHOD'] == 'POST') && $action == 'delete') {
        if (empty($input['profile_id'])) {
            sendResponse(false, 'Profile ID is required for deletion');
        }
        
        $check_stmt = $pdo->prepare("SELECT profile_id FROM userprofiles WHERE profile_id = ?");
        $check_stmt->execute([$input['profile_id']]);
        if (!$check_stmt->fetch()) {
            sendResponse(false, 'Profile not found');
        }
        
        $stmt = $pdo->prepare("DELETE FROM userprofiles WHERE profile_id = ?");
        $stmt->execute([$input['profile_id']]);
        
        sendResponse(true, 'User profile deleted successfully');
    }
    
    else {
        sendResponse(false, 'Invalid action or method');
    }
    
} catch (PDOException $e) {
    sendResponse(false, 'Database error: ' . $e->getMessage());
} catch (Exception $e) {
    sendResponse(false, 'Error: ' . $e->getMessage());
}
?>