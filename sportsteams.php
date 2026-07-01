<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') exit(0);

$host = 'localhost'; $dbname = 'cam'; $username = 'root'; $password = '';

function sendResponse($success, $message, $data = null) {
    echo json_encode(['success' => $success, 'message' => $message, 'data' => $data]);
    exit;
}

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    $action = $_GET['action'] ?? $input['action'] ?? '';

    if ($_SERVER['REQUEST_METHOD'] == 'GET' && $action == 'get') {
        $stmt = $pdo->prepare("
            SELECT t.*, c.CategoryName, coach.user_name as coach_name, asst.user_name as assistant_name
            FROM sportsteams t
            LEFT JOIN sportscategories c ON t.SportCategoryID = c.SportCategoryID
            LEFT JOIN users coach ON t.CoachID = coach.user_id
            LEFT JOIN users asst ON t.AssistantCoachID = asst.user_id
            ORDER BY t.TeamName
        ");
        $stmt->execute();
        sendResponse(true, 'Teams fetched', $stmt->fetchAll(PDO::FETCH_ASSOC));
    }
    elseif ($_SERVER['REQUEST_METHOD'] == 'POST' && $action == 'add') {
        $required = ['TeamName', 'SportCategoryID', 'Season'];
        foreach ($required as $f) if (empty($input[$f])) sendResponse(false, "Missing $f");
        $stmt = $pdo->prepare("INSERT INTO sportsteams (TeamName, SportCategoryID, CoachID, AssistantCoachID, Season, Division, MaxPlayers, Status, EstablishedDate, CreatedBy) VALUES (?,?,?,?,?,?,?,?,?,?)");
        $stmt->execute([$input['TeamName'], $input['SportCategoryID'], $input['CoachID'] ?? null, $input['AssistantCoachID'] ?? null, $input['Season'], $input['Division'] ?? null, $input['MaxPlayers'] ?? 25, $input['Status'] ?? 'Pending', $input['EstablishedDate'] ?? null, $input['CreatedBy'] ?? null]);
        sendResponse(true, 'Team added', ['TeamID' => $pdo->lastInsertId()]);
    }
    elseif (($_SERVER['REQUEST_METHOD'] == 'POST') && $action == 'delete') {
        if (empty($input['TeamID'])) sendResponse(false, 'TeamID required');
        $stmt = $pdo->prepare("DELETE FROM sportsteams WHERE TeamID = ?");
        $stmt->execute([$input['TeamID']]);
        sendResponse(true, 'Team deleted');
    }
    else sendResponse(false, 'Invalid action');
} catch (PDOException $e) { sendResponse(false, 'Database error: ' . $e->getMessage()); }
?>