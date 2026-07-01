<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Use MySQLi with prepared statements (SECURE)
$conn = new mysqli("localhost", "root", "", "cam");

if ($conn->connect_error) {
    echo json_encode(["success" => false, "message" => "Database connection failed"]);
    exit;
}

$raw_data = file_get_contents('php://input');
$data = json_decode($raw_data, true);

// Get credentials (support both email and username)
$login_input = $data['username'] ?? $data['email'] ?? '';
$password = $data['password'] ?? '';

if (empty($login_input) || empty($password)) {
    echo json_encode(["success" => false, "message" => "Email/Username and password required"]);
    exit;
}

// FIXED: Check BOTH email AND user_name columns
$sql = "SELECT user_id, user_name, email, password, phone, user_type FROM users WHERE email = ? OR user_name = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("ss", $login_input, $login_input);
$stmt->execute();
$result = $stmt->get_result();

if ($row = $result->fetch_assoc()) {
    if (password_verify($password, $row['password'])) {
        $user = [
            'user_id' => $row['user_id'],
            'user_name' => $row['user_name'],
            'email' => $row['email'],
            'phone' => $row['phone'],
            'user_type' => $row['user_type']  // This will now be 'ClubLeader'
        ];
        
        // Determine dashboard based on user_type
        $dashboard = 'StudentDashboard';
        if ($row['user_type'] == 'ClubLeader') {
            $dashboard = 'ClubLeaderDashboard';
        } elseif ($row['user_type'] == 'Admin') {
            $dashboard = 'AdminDashboard';
        }
        
        echo json_encode([
            "success" => true, 
            "message" => "Login successful", 
            "user" => $user,
            "dashboard" => $dashboard,
            "redirect_to" => $dashboard
        ]);
    } else {
        echo json_encode(["success" => false, "message" => "Invalid password"]);
    }
} else {
    echo json_encode(["success" => false, "message" => "User not found with: " . $login_input]);
}

$stmt->close();
$conn->close();
?>