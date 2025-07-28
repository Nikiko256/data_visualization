<?php
// Only allow GET requests
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    header('Content-Type: text/plain');
    echo "OK";
} else {
    // Respond with 405 Method Not Allowed for other request types
    http_response_code(405);
    echo "Method Not Allowed";
}
