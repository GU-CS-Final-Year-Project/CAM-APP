<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

function jsonError($msg) {
    ob_clean();
    echo json_encode(['success' => false, 'message' => $msg]);
    exit;
}
set_error_handler(function($severity, $msg, $file, $line) {
    jsonError("PHP Error: $msg in $file:$line");
});
set_exception_handler(function($e) {
    jsonError("PHP Exception: " . $e->getMessage());
});

$host = 'localhost';
$db   = 'cam';
$user = 'root';
$pass = '';

$conn = new mysqli($host, $user, $pass, $db);

if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database connection failed']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
$action = $data['action'] ?? $_GET['action'] ?? '';

switch ($action) {

    case 'register':
        $name         = trim($data['name'] ?? '');
        $email        = trim($data['email'] ?? '');
        $studentNumber = trim($data['student_number'] ?? '');
        $phone        = $data['phone'] ?? null;
        $password     = $data['password'] ?? '';
        $userType     = $data['user_type'] ?? 'Student';
        if (!$name || !$email || !$studentNumber || !$password) {
            echo json_encode(['success' => false, 'message' => 'Name, email, student number, and password are required']);
            exit;
        }

        $check = $conn->prepare("SELECT student_id FROM students WHERE student_number = ? AND (user_id IS NULL OR user_id = 0) LIMIT 1");
        $check->bind_param("s", $studentNumber);
        $check->execute();
        $checkResult = $check->get_result();
        $existing = $checkResult->fetch_assoc();
        $check->close();

        if (!$existing) {
            echo json_encode(['success' => false, 'message' => 'Student number not recognized or already registered']);
            exit;
        }

        $hashedPassword = password_hash($password, PASSWORD_DEFAULT);

        $conn->begin_transaction();
        try {
            $stmt = $conn->prepare("INSERT INTO users (user_name, email, password, phone, user_type) VALUES (?, ?, ?, ?, ?)");
            $stmt->bind_param("sssss", $name, $email, $hashedPassword, $phone, $userType);
            $stmt->execute();
            $userId = $conn->insert_id;
            $stmt->close();

            $stmt2 = $conn->prepare("UPDATE students SET user_id = ?, status = 'active' WHERE student_id = ?");
            $stmt2->bind_param("ii", $userId, $existing['student_id']);
            $stmt2->execute();
            $stmt2->close();

            $conn->commit();
            echo json_encode(['success' => true, 'message' => 'Account created successfully']);
        } catch (Exception $e) {
            $conn->rollback();
            $msg = strpos($e->getMessage(), 'Duplicate') !== false
                ? 'Email or student number already exists'
                : 'Registration failed: ' . $e->getMessage();
            echo json_encode(['success' => false, 'message' => $msg]);
        }
        break;

    case 'login':
        $username = trim($data['username'] ?? '');
        $email    = trim($data['email'] ?? '');
        $password = $data['password'] ?? '';

        $identifier = $username ?: $email;
        if (!$identifier || !$password) {
            echo json_encode(['success' => false, 'message' => 'Username/email/student number and password are required']);
            exit;
        }

        $stmt = $conn->prepare("
            SELECT u.*, s.student_number, s.faculty, s.year_of_study, s.status as student_status
            FROM users u
            LEFT JOIN students s ON u.user_id = s.user_id
            WHERE u.email = ? OR u.user_name = ? OR s.student_number = ?
            LIMIT 1
        ");
        $stmt->bind_param("sss", $identifier, $identifier, $identifier);
        $stmt->execute();
        $result = $stmt->get_result();
        $user = $result->fetch_assoc();
        $stmt->close();

        if (!$user || !password_verify($password, $user['password'])) {
            echo json_encode(['success' => false, 'message' => 'Invalid credentials']);
            exit;
        }

        $dashboard = '';
        switch ($user['user_type']) {
            case 'Admin':        $dashboard = 'AdminDashboard';        break;
            case 'ClubLeader':   $dashboard = 'ClubLeaderDashboard';   break;
            default:             $dashboard = 'StudentDashboard';       break;
        }

        echo json_encode([
            'success' => true,
            'data' => [
                'user' => [
                    'user_id'    => (int)$user['user_id'],
                    'user_name'  => $user['user_name'],
                    'email'      => $user['email'],
                    'user_type'  => $user['user_type'],
                    'phone'      => $user['phone'],
                    'student_number' => $user['student_number'],
                ],
                'dashboard' => $dashboard,
            ],
        ]);
        break;

    case 'get':
        $userId = (int)($data['user_id'] ?? $_GET['user_id'] ?? 0);
        if (!$userId) {
            echo json_encode(['success' => false, 'message' => 'user_id is required']);
            exit;
        }
        $stmt = $conn->prepare("
            SELECT u.*, s.student_number, s.faculty, s.year_of_study, s.status as student_status
            FROM users u
            LEFT JOIN students s ON u.user_id = s.user_id
            WHERE u.user_id = ?
        ");
        $stmt->bind_param("i", $userId);
        $stmt->execute();
        $result = $stmt->get_result();
        $user = $result->fetch_assoc();
        $stmt->close();

        if ($user) {
            echo json_encode(['success' => true, 'data' => $user]);
        } else {
            echo json_encode(['success' => false, 'message' => 'User not found']);
        }
        break;

    case 'get_students':
        $result = $conn->query("
            SELECT u.user_id, u.user_name, u.email, u.phone, u.user_type,
                   s.student_number, s.faculty, s.year_of_study, s.status
            FROM users u
            JOIN students s ON u.user_id = s.user_id
            ORDER BY u.user_name ASC
        ");
        $students = $result->fetch_all(MYSQLI_ASSOC);
        echo json_encode(['success' => true, 'data' => $students]);
        break;

    case 'save_push_token':
        $userId = (int)($data['user_id'] ?? 0);
        $pushToken = $data['push_token'] ?? '';
        if (!$userId || !$pushToken) {
            echo json_encode(['success' => false, 'message' => 'user_id and push_token are required']);
            exit;
        }
        $stmt = $conn->prepare("UPDATE users SET push_token = ? WHERE user_id = ?");
        $stmt->bind_param("si", $pushToken, $userId);
        $stmt->execute();
        $stmt->close();
        echo json_encode(['success' => true, 'message' => 'Push token saved']);
        break;

    default:
        echo json_encode(['success' => false, 'message' => 'Unknown action']);
}
?>