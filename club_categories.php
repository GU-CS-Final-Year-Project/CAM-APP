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

// Enhanced error logging
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', 'php_errors.log');

function sendResponse($success, $message, $data = null) {
    $response = [
        'success' => $success,
        'message' => $message,
        'data' => $data
    ];
    echo json_encode($response);
    exit;
}

// Test endpoint to verify API is working
if (isset($_GET['test'])) {
    sendResponse(true, 'Club Categories API is working!', [
        'timestamp' => date('Y-m-d H:i:s'),
        'file' => basename(__FILE__),
        'method' => $_SERVER['REQUEST_METHOD']
    ]);
}

try {
    // Database connection
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Get request method and input data
    $method = $_SERVER['REQUEST_METHOD'];
    $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
    $action = $_GET['action'] ?? $input['action'] ?? '';

    error_log("Request: $method, Action: $action");

    // Handle GET request - Get all categories (Admin)
    if ($method == 'GET' && $action == 'get') {
        $stmt = $pdo->prepare("SELECT category_id, category_name, description, created_by, created_at, updated_at FROM club_categories ORDER BY created_at DESC");
        $stmt->execute();
        $categories = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        sendResponse(true, 'Categories fetched successfully', $categories);
    }
    
    // GET - Get categories for students (public view) - ADDED
    elseif ($method == 'GET' && $action == 'get_public') {
        $stmt = $pdo->prepare("
            SELECT 
                category_id as CategoryID,
                category_name as CategoryName,
                description as Description
            FROM club_categories
            ORDER BY category_name
        ");
        $stmt->execute();
        $categories = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        sendResponse(true, 'Categories fetched successfully', $categories);
    }
    
    // Handle POST requests (Admin only)
    if ($method == 'POST') {
        switch ($action) {
            case 'add':
                // Validate required fields
                if (empty($input['category_name'])) {
                    sendResponse(false, 'Category name is required');
                }
                if (empty($input['description'])) {
                    sendResponse(false, 'Description is required');
                }

                // Check if category_name already exists
                $check_stmt = $pdo->prepare("SELECT category_id FROM club_categories WHERE category_name = ?");
                $check_stmt->execute([$input['category_name']]);
                if ($check_stmt->fetch()) {
                    sendResponse(false, 'Category name already exists');
                }

                // Insert category with created_by (optional, can be passed from frontend)
                $created_by = $input['created_by'] ?? null;
                $stmt = $pdo->prepare("INSERT INTO club_categories (category_name, description, created_by, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())");
                $stmt->execute([
                    trim($input['category_name']),
                    trim($input['description']),
                    $created_by
                ]);

                $last_id = $pdo->lastInsertId();
                sendResponse(true, 'Category added successfully', ['category_id' => $last_id]);
                break;

            case 'update':
                if (empty($input['category_id'])) {
                    sendResponse(false, 'Category ID is required');
                }

                // Check if category exists
                $check_stmt = $pdo->prepare("SELECT category_id FROM club_categories WHERE category_id = ?");
                $check_stmt->execute([$input['category_id']]);
                if (!$check_stmt->fetch()) {
                    sendResponse(false, 'Category not found');
                }

                // Check if category_name already exists (excluding current category)
                if (isset($input['category_name'])) {
                    $check_stmt = $pdo->prepare("SELECT category_id FROM club_categories WHERE category_name = ? AND category_id != ?");
                    $check_stmt->execute([$input['category_name'], $input['category_id']]);
                    if ($check_stmt->fetch()) {
                        sendResponse(false, 'Category name already exists for another category');
                    }
                }

                $stmt = $pdo->prepare("UPDATE club_categories SET category_name = ?, description = ?, updated_at = NOW() WHERE category_id = ?");
                $stmt->execute([
                    trim($input['category_name']),
                    trim($input['description']),
                    $input['category_id']
                ]);

                sendResponse(true, 'Category updated successfully');
                break;

            case 'delete':
                if (empty($input['category_id'])) {
                    sendResponse(false, 'Category ID is required');
                }

                // Check if category exists
                $check_stmt = $pdo->prepare("SELECT category_id FROM club_categories WHERE category_id = ?");
                $check_stmt->execute([$input['category_id']]);
                if (!$check_stmt->fetch()) {
                    sendResponse(false, 'Category not found');
                }

                // Check if category is being used by any club
                $check_clubs = $pdo->prepare("SELECT club_id FROM clubs WHERE category_id = ? LIMIT 1");
                $check_clubs->execute([$input['category_id']]);
                if ($check_clubs->fetch()) {
                    sendResponse(false, 'Cannot delete category because it is being used by one or more clubs');
                }

                // Delete category
                $stmt = $pdo->prepare("DELETE FROM club_categories WHERE category_id = ?");
                $stmt->execute([$input['category_id']]);

                sendResponse(true, 'Category deleted successfully');
                break;

            default:
                sendResponse(false, 'Invalid action: ' . $action);
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