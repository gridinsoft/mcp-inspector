<?php
// Test router: real candidate routes/controller/response classes, no .env or DB.
$root = getenv('INSPECTOR_TEST_ROOT');
if (!$root || !is_file($root . '/controllers/ControllerMCP.php')) {
    throw new RuntimeException('INSPECTOR_TEST_ROOT must point to the backend candidate');
}
require $root . '/vendor/autoload.php';
spl_autoload_register(static function ($class) use ($root) {
    foreach (['Controllers\\' => '/controllers/', 'App\\' => '/app/'] as $prefix => $folder) {
        if (str_starts_with($class, $prefix)) {
            $file = $root . $folder . str_replace('\\', '/', substr($class, strlen($prefix))) . '.php';
            if (is_file($file)) require $file;
            return;
        }
    }
}, true, true);
$router = new class {
    public array $items = [];
    public function Add(string $path, string $name): object {
        $item = new class($name) {
            public string $controller;
            public function __construct(public string $name) {}
            public function Controller(string $class): self { $this->controller = $class; return $this; }
        };
        $this->items[$path] = $item;
        return $item;
    }
};
require $root . '/routes/mcp.inc.php';
// Only the synthetic startup credential is accepted. No environment or DB is loaded.
$controller = new class extends Controllers\ControllerMCP {
    protected function newUser(): App\User
    {
        return new class extends App\User {
            public function __construct() {}
            public function ApiKey(string $apikey): bool { return $apikey === 'integration-placeholder'; }
            public function getId(): ?int { return 1; }
        };
    }
};
try {
    $route = $router->items[parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH)] ?? null;
    if (!$route) throw new App\Core\HttpException('Not found', 404);
    $method = str_replace('-', '_', substr($route->name, 4));
    $result = $controller->$method();
    echo App\Core\JsonResponse::send($result, http_response_code() ?: 200);
} catch (App\Core\HttpException $error) {
    echo App\Core\JsonResponse::send($error->payload(), $error->statusCode());
}
