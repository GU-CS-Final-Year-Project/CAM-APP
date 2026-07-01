<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

// Database configuration
$host = 'localhost';
$dbname = 'cam';
$username = 'root';
$password = '';

// Enable error logging for debugging
error_log("API Request: " . $_SERVER['REQUEST_METHOD'] . " - Action: " . ($_GET['action'] ?? 'none'));

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

    error_log("Action: $action");

    // Handle GET request - Get all students with user info
    if ($_SERVER['REQUEST_METHOD'] == 'GET' && $action == 'get') {
        $stmt = $pdo->prepare("
            SELECT 
                s.student_id,
                s.user_id,
                s.student_number,
                s.faculty,
                s.year_of_study,
                s.enrollment_date,
                s.status,
                s.created_at,
                s.updated_at,
                u.user_name as student_name,
                u.email,
                u.phone
            FROM students s
            JOIN users u ON s.user_id = u.user_id
            WHERE u.user_type = 'Student'
            ORDER BY s.created_at DESC
        ");
        $stmt->execute();
        $students = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        sendResponse(true, 'Students fetched successfully', $students);
    }
    
    // Handle POST requests
    if ($_SERVER['REQUEST_METHOD'] == 'POST') {
        switch ($action) {
            case 'add':
                // Validate required fields
                $required_fields = ['student_name', 'student_number', 'faculty', 'year_of_study', 'enrollment_date', 'email', 'password'];
                foreach ($required_fields as $field) {
                    if (empty($input[$field])) {
                        sendResponse(false, "Missing required field: $field");
                    }
                }

                // Check if email already exists
                $check_email = $pdo->prepare("SELECT user_id FROM users WHERE email = ?");
                $check_email->execute([$input['email']]);
                if ($check_email->fetch()) {
                    sendResponse(false, 'Email already exists');
                }

                // Check if student_number exists
                $check_stmt = $pdo->prepare("SELECT student_id FROM students WHERE student_number = ?");
                $check_stmt->execute([$input['student_number']]);
                if ($check_stmt->fetch()) {
                    sendResponse(false, 'Student Number already exists');
                }

                // First, insert into users table
                $hashedPassword = password_hash($input['password'], PASSWORD_DEFAULT);
                $insertUser = $pdo->prepare("
                    INSERT INTO users (user_name, email, password, phone, user_type, created_at) 
                    VALUES (?, ?, ?, ?, 'Student', NOW())
                ");
                $insertUser->execute([
                    $input['student_name'],
                    $input['email'],
                    $hashedPassword,
                    $input['phone'] ?? null
                ]);
                
                $userId = $pdo->lastInsertId();

                // Then, insert into students table
                $stmt = $pdo->prepare("
                    INSERT INTO students (user_id, student_number, faculty, year_of_study, enrollment_date, status) 
                    VALUES (?, ?, ?, ?, ?, ?)
                ");
                $stmt->execute([
                    $userId,
                    $input['student_number'],
                    $input['faculty'],
                    $input['year_of_study'],
                    $input['enrollment_date'],
                    $input['status'] ?? 'Active'
                ]);

                sendResponse(true, 'Student added successfully', ['student_id' => $pdo->lastInsertId(), 'user_id' => $userId]);
                break;

            case 'update':
                if (empty($input['student_id'])) {
                    sendResponse(false, 'Student ID is required');
                }

                // Get user_id from student
                $getUser = $pdo->prepare("SELECT user_id FROM students WHERE student_id = ?");
                $getUser->execute([$input['student_id']]);
                $student = $getUser->fetch(PDO::FETCH_ASSOC);
                
                if (!$student) {
                    sendResponse(false, 'Student not found');
                }
                
                $userId = $student['user_id'];

                // Update users table
                $updateUser = $pdo->prepare("
                    UPDATE users SET user_name = ?, email = ?, phone = ? WHERE user_id = ?
                ");
                $updateUser->execute([
                    $input['student_name'],
                    $input['email'],
                    $input['phone'] ?? null,
                    $userId
                ]);

                // Update students table
                $stmt = $pdo->prepare("
                    UPDATE students 
                    SET student_number = ?, faculty = ?, year_of_study = ?, enrollment_date = ?, status = ?, updated_at = NOW() 
                    WHERE student_id = ?
                ");
                $stmt->execute([
                    $input['student_number'],
                    $input['faculty'],
                    $input['year_of_study'],
                    $input['enrollment_date'],
                    $input['status'] ?? 'Active',
                    $input['student_id']
                ]);

                sendResponse(true, 'Student updated successfully');
                break;

            case 'delete':
                if (empty($input['student_id'])) {
                    sendResponse(false, 'Student ID is required');
                }

                // Get user_id from student
                $getUser = $pdo->prepare("SELECT user_id FROM students WHERE student_id = ?");
                $getUser->execute([$input['student_id']]);
                $student = $getUser->fetch(PDO::FETCH_ASSOC);
                
                if ($student) {
                    // Delete from students first
                    $stmt = $pdo->prepare("DELETE FROM students WHERE student_id = ?");
                    $stmt->execute([$input['student_id']]);
                    
                    // Then delete from users
                    $deleteUser = $pdo->prepare("DELETE FROM users WHERE user_id = ?");
                    $deleteUser->execute([$student['user_id']]);
                }

                sendResponse(true, 'Student deleted successfully');
                break;

            default:
                sendResponse(false, 'Invalid action');
        }
    }

    // If no valid action matched
    sendResponse(false, 'Invalid request method or action');

} catch (PDOException $e) {
    error_log("Database error: " . $e->getMessage());
    sendResponse(false, 'Database error: ' . $e->getMessage());
} catch (Exception $e) {
    error_log("General error: " . $e->getMessage());
    sendResponse(false, 'Server error: ' . $e->getMessage());
}
?>