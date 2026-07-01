<?php
// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

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
    http_response_code($success ? 200 : 400);
    echo json_encode([
        'success' => $success,
        'message' => $message,
        'data' => $data
    ], JSON_PRETTY_PRINT);
    exit;
}

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Get input data
    $inputData = file_get_contents('php://input');
    $input = json_decode($inputData, true);
    
    // Get action from both GET and POST data
    $action = $_GET['action'] ?? $input['action'] ?? '';

    // Debug logging
    error_log("Request Method: " . $_SERVER['REQUEST_METHOD']);
    error_log("Action: " . $action);

    // Handle GET request - Get all teachers with user info
    if ($_SERVER['REQUEST_METHOD'] == 'GET' && $action == 'get') {
        $stmt = $pdo->prepare("
            SELECT 
                t.teacher_id,
                t.user_id,
                t.employee_number,
                t.department,
                t.course_unit,
                t.hiredate,
                t.status,
                t.created_at,
                t.updated_at,
                u.user_name as teacher_name,
                u.email,
                u.phone
            FROM teacher t
            JOIN users u ON t.user_id = u.user_id
            WHERE u.user_type = 'Teacher'
            ORDER BY t.teacher_id DESC
        ");
        $stmt->execute();
        $teachers = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        error_log("Found " . count($teachers) . " teachers in database");
        
        // Return the teachers array directly as data
        sendResponse(true, 'Teachers fetched successfully', $teachers);
    }
    
    // Handle POST request - Add new teacher
    if ($_SERVER['REQUEST_METHOD'] == 'POST' && $action == 'add') {
        // Validate required fields
        $required_fields = ['teacher_name', 'employee_number', 'department', 'course_unit', 'hiredate', 'email', 'password'];
        $missing_fields = [];
        
        foreach ($required_fields as $field) {
            if (empty($input[$field])) {
                $missing_fields[] = $field;
            }
        }
        
        if (!empty($missing_fields)) {
            sendResponse(false, 'Missing required fields: ' . implode(', ', $missing_fields));
        }
        
        // Validate hire date format
        if (!DateTime::createFromFormat('Y-m-d', $input['hiredate'])) {
            sendResponse(false, 'Invalid hire date format. Use YYYY-MM-DD');
        }
        
        // Check if email already exists
        $check_email = $pdo->prepare("SELECT user_id FROM users WHERE email = ?");
        $check_email->execute([$input['email']]);
        if ($check_email->fetch()) {
            sendResponse(false, 'Email already exists');
        }
        
        // Check if employee_number already exists
        $check_stmt = $pdo->prepare("SELECT teacher_id FROM teacher WHERE employee_number = ?");
        $check_stmt->execute([$input['employee_number']]);
        if ($check_stmt->fetch()) {
            sendResponse(false, 'Employee Number already exists');
        }
        
        // First, insert into users table
        $hashedPassword = password_hash($input['password'], PASSWORD_DEFAULT);
        $insertUser = $pdo->prepare("
            INSERT INTO users (user_name, email, password, phone, user_type, created_at) 
            VALUES (?, ?, ?, ?, 'Teacher', NOW())
        ");
        $insertUser->execute([
            $input['teacher_name'],
            $input['email'],
            $hashedPassword,
            $input['phone'] ?? null
        ]);
        
        $userId = $pdo->lastInsertId();
        
        // Then, insert into teacher table
        $stmt = $pdo->prepare("
            INSERT INTO teacher (user_id, employee_number, department, course_unit, hiredate, status) 
            VALUES (?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $userId,
            $input['employee_number'],
            $input['department'],
            $input['course_unit'],
            $input['hiredate'],
            $input['status'] ?? 'Active'
        ]);
        
        $last_id = $pdo->lastInsertId();
        
        sendResponse(true, 'Teacher added successfully', ['teacher_id' => $last_id, 'user_id' => $userId]);
    }
    
    // Handle UPDATE requests
    if (($_SERVER['REQUEST_METHOD'] == 'PUT' || $_SERVER['REQUEST_METHOD'] == 'POST') && $action == 'update') {
        // Validate required fields
        if (empty($input['teacher_id'])) {
            sendResponse(false, 'Teacher ID is required for update');
        }
        
        // Get user_id from teacher
        $getUser = $pdo->prepare("SELECT user_id FROM teacher WHERE teacher_id = ?");
        $getUser->execute([$input['teacher_id']]);
        $teacher = $getUser->fetch(PDO::FETCH_ASSOC);
        
        if (!$teacher) {
            sendResponse(false, 'Teacher not found');
        }
        
        $userId = $teacher['user_id'];
        
        // Check if employee_number already exists (excluding current teacher)
        if (isset($input['employee_number'])) {
            $check_emp_stmt = $pdo->prepare("SELECT teacher_id FROM teacher WHERE employee_number = ? AND teacher_id != ?");
            $check_emp_stmt->execute([$input['employee_number'], $input['teacher_id']]);
            if ($check_emp_stmt->fetch()) {
                sendResponse(false, 'Employee Number already exists for another teacher');
            }
        }
        
        // Check if email already exists (excluding current user)
        if (isset($input['email'])) {
            $check_email = $pdo->prepare("SELECT user_id FROM users WHERE email = ? AND user_id != ?");
            $check_email->execute([$input['email'], $userId]);
            if ($check_email->fetch()) {
                sendResponse(false, 'Email already exists for another user');
            }
        }
        
        // Update users table
        $updateUser = $pdo->prepare("
            UPDATE users SET user_name = ?, email = ?, phone = ? WHERE user_id = ?
        ");
        $updateUser->execute([
            $input['teacher_name'],
            $input['email'],
            $input['phone'] ?? null,
            $userId
        ]);
        
        // Update password if provided
        if (!empty($input['password'])) {
            $hashedPassword = password_hash($input['password'], PASSWORD_DEFAULT);
            $updatePassword = $pdo->prepare("UPDATE users SET password = ? WHERE user_id = ?");
            $updatePassword->execute([$hashedPassword, $userId]);
        }
        
        // Update teacher table
        $stmt = $pdo->prepare("
            UPDATE teacher 
            SET employee_number = ?, department = ?, course_unit = ?, hiredate = ?, status = ?, updated_at = NOW() 
            WHERE teacher_id = ?
        ");
        $stmt->execute([
            $input['employee_number'],
            $input['department'],
            $input['course_unit'],
            $input['hiredate'],
            $input['status'] ?? 'Active',
            $input['teacher_id']
        ]);
        
        sendResponse(true, 'Teacher updated successfully');
    }
    
    // Handle DELETE requests
    if (($_SERVER['REQUEST_METHOD'] == 'DELETE' || $_SERVER['REQUEST_METHOD'] == 'POST') && $action == 'delete') {
        if (empty($input['teacher_id'])) {
            sendResponse(false, 'Teacher ID is required for deletion');
        }
        
        // Get user_id from teacher
        $getUser = $pdo->prepare("SELECT user_id, employee_number FROM teacher WHERE teacher_id = ?");
        $getUser->execute([$input['teacher_id']]);
        $teacher = $getUser->fetch(PDO::FETCH_ASSOC);
        
        if (!$teacher) {
            sendResponse(false, 'Teacher not found');
        }
        
        $userId = $teacher['user_id'];
        
        // Delete from teacher table first
        $stmt = $pdo->prepare("DELETE FROM teacher WHERE teacher_id = ?");
        $stmt->execute([$input['teacher_id']]);
        
        // Then delete from users table
        $deleteUser = $pdo->prepare("DELETE FROM users WHERE user_id = ?");
        $deleteUser->execute([$userId]);
        
        sendResponse(true, 'Teacher deleted successfully');
    }
    
    // If no valid action matched
    sendResponse(false, 'Invalid action or method');
    
} catch (PDOException $e) {
    sendResponse(false, 'Database error: ' . $e->getMessage());
} catch (Exception $e) {
    sendResponse(false, 'Error: ' . $e->getMessage());
}
?>