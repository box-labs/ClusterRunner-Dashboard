<?php
/**
 * This is an extremely simple proxy so that all ClusterRunner API requests can go
 * thru the same host as the dashboard.
 */
$targetUrl = 'http://' . substr($_SERVER['PATH_INFO'], 1);  // cut off leading "/"
$origin = 'http://' . $_SERVER['HTTP_HOST'];

$ch = curl_init($targetUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
curl_setopt($ch, CURLOPT_VERBOSE, 1);
curl_setopt($ch, CURLOPT_HEADER, 1);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Origin: ' . $origin,
]);

$response = curl_exec($ch);

$headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
$headers = substr($response, 0, $headerSize);
$body = substr($response, $headerSize);
curl_close($ch);

$headers = explode("\r\n", $headers);
$headersByName = [];
foreach ($headers as $header) {
    $colonIndex = strpos($header, ':');
    if ($colonIndex === false) continue;
    $headerKey = substr($header, 0, $colonIndex);
    $headerValue = substr($header, $colonIndex + 2);
    $headersByName[$headerKey] = $headerValue;
}

// Do a dumb version of web browser CORS check.
if ($headersByName['Access-Control-Allow-Origin'] != $origin) {
    $body = json_encode(['error' => 'Request denied due to cross-origin restrictions.']);
}

header('Content-Type: ' . $headersByName['Content-Type']);
echo($body);
