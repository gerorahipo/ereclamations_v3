<?php
// ============================================================
// public/index.php — Routeur unique (Front Controller)
// ============================================================

declare(strict_types=1);

// ─── Charger le fichier .env si présent ──────────────────────
if (file_exists(dirname(__DIR__) . '/.env')) {
    $lines = file(dirname(__DIR__) . '/.env', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if (empty($line) || strpos($line, '#') === 0) continue;
        if (strpos($line, '=') !== false) {
            list($name, $value) = explode('=', $line, 2);
            $name = trim($name);
            $value = trim($value);
            // Supprimer les guillemets éventuels autour de la valeur
            $value = trim($value, '"\'');
            if (!array_key_exists($name, $_SERVER) && !array_key_exists($name, $_ENV)) {
                putenv("{$name}={$value}");
                $_ENV[$name] = $value;
                $_SERVER[$name] = $value;
            }
        }
    }
}

// ─── Autoload PSR-4 manuel ──────────────────────────────────
spl_autoload_register(function (string $class): void {
    $base = dirname(__DIR__) . '/src/';
    $file = $base . str_replace(['App\\', '\\'], ['', '/'], $class) . '.php';
    if (file_exists($file)) require_once $file;
});

// ─── Sécurité & CORS ────────────────────────────────────────
$allowedOrigin = getenv('CORS_ORIGIN') ?: 'http://localhost:81';
header("Access-Control-Allow-Origin: {$allowedOrigin}");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Active-Agency");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json; charset=UTF-8");

// Headers de sécurité supplémentaires
header("X-Content-Type-Options: nosniff");
header("X-Frame-Options: DENY");
header("X-XSS-Protection: 1; mode=block");
header("Referrer-Policy: strict-origin-when-cross-origin");
header("Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'");
header("Strict-Transport-Security: max-age=31536000; includeSubDomains");
header("Permissions-Policy: camera=(), microphone=(), geolocation=()");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ─── Routing ────────────────────────────────────────────────
$method = $_SERVER['REQUEST_METHOD'];
$uri    = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$uri    = rtrim(preg_replace('#/+#', '/', $uri), '/');

// Retirer le préfixe /api
$path = preg_replace('#^/api#', '', $uri) ?: '/';

// Découper le chemin
$segments = array_values(array_filter(explode('/', $path)));

try {
    // ─── Public (Suivi Client) ───────────────────────────────
    // Route: /api/public/tracking/{numero}
    // Debug: on cherche 'public' dans les segments
    if (in_array('public', $segments)) {
        $publicIdx = array_search('public', $segments);
        $sub = $segments[$publicIdx+1] ?? '';
        $ctrl = new App\Controllers\PublicController();
        
        if ($sub === 'tracking' && isset($segments[$publicIdx+2])) {
            if ($method === 'GET') {
                $ticketNumero = implode('/', array_slice($segments, $publicIdx + 2));
                $ctrl->track($ticketNumero);
                return;
            }
        } elseif ($sub === 'init' && $method === 'GET') {
            $ctrl->init();
            return;
        } elseif ($sub === 'declare' && $method === 'POST') {
            $ctrl->submit();
            return;
        } elseif ($sub === 'types-clients' && $method === 'GET') {
            $ctrl->typesClients();
            return;
        } elseif ($sub === 'motifs' && $method === 'GET') {
            $ctrl->motifs();
            return;
        } elseif ($sub === 'sous-motifs' && $method === 'GET') {
            $ctrl->sousMotifs();
            return;
        } elseif ($sub === 'check-identifier' && $method === 'GET') {
            $ctrl->checkIdentifier();
            return;
        }
    }

    // ─── Administration (Paramétrage) ──────────────────────────
    // Auth::require() ajouté en défense en profondeur (audit sécurité prod)
    if ($segments[0] === 'travailleurs' && $method === 'GET') {
        App\Middleware\Auth::require();
        (new App\Controllers\ParametrageController())->travailleurs();
        return;
    }
    if ($segments[0] === 'employeurs' && $method === 'GET') {
        App\Middleware\Auth::require();
        (new App\Controllers\ParametrageController())->employeurs();
        return;
    }
    if ($segments[0] === 'sinistres' && $method === 'GET') {
        App\Middleware\Auth::require();
        (new App\Controllers\ParametrageController())->sinistres();
        return;
    }

    if ($segments[0] === 'travailleurs' && $method === 'POST' && (!isset($segments[1]) || $segments[1] !== 'bulk')) {
        (new App\Controllers\ParametrageController())->createTravailleur();
        return;
    }
    if ($segments[0] === 'employeurs' && $method === 'POST' && (!isset($segments[1]) || $segments[1] !== 'bulk')) {
        (new App\Controllers\ParametrageController())->createEmployeur();
        return;
    }
    if ($segments[0] === 'sinistres' && $method === 'POST' && (!isset($segments[1]) || $segments[1] !== 'bulk')) {
        (new App\Controllers\ParametrageController())->createSinistre();
        return;
    }

    if (isset($segments[1]) && $segments[0] === 'travailleurs' && $segments[1] === 'bulk' && $method === 'POST') {
        (new App\Controllers\ParametrageController())->bulkTravailleurs();
        return;
    }
    if (isset($segments[1]) && $segments[0] === 'employeurs' && $segments[1] === 'bulk' && $method === 'POST') {
        (new App\Controllers\ParametrageController())->bulkEmployeurs();
        return;
    }
    if (isset($segments[1]) && $segments[0] === 'sinistres' && $segments[1] === 'bulk' && $method === 'POST') {
        (new App\Controllers\ParametrageController())->bulkSinistres();
        return;
    }

    if (isset($segments[1]) && $segments[0] === 'travailleurs' && $segments[1] === 'clear' && $method === 'DELETE') {
        (new App\Controllers\ParametrageController())->clearTravailleurs();
        return;
    }
    if (isset($segments[1]) && $segments[0] === 'employeurs' && $segments[1] === 'clear' && $method === 'DELETE') {
        (new App\Controllers\ParametrageController())->clearEmployeurs();
        return;
    }
    if (isset($segments[1]) && $segments[0] === 'sinistres' && $segments[1] === 'clear' && $method === 'DELETE') {
        (new App\Controllers\ParametrageController())->clearSinistres();
        return;
    }

    if (isset($segments[1]) && $segments[0] === 'travailleurs' && is_numeric($segments[1]) && $method === 'DELETE') {
        (new App\Controllers\ParametrageController())->deleteEntity('travailleurs', (int)$segments[1]);
        return;
    }
    if (isset($segments[1]) && $segments[0] === 'employeurs' && is_numeric($segments[1]) && $method === 'DELETE') {
        (new App\Controllers\ParametrageController())->deleteEntity('employeurs', (int)$segments[1]);
        return;
    }
    if (isset($segments[1]) && $segments[0] === 'sinistres' && is_numeric($segments[1]) && $method === 'DELETE') {
        (new App\Controllers\ParametrageController())->deleteEntity('sinistres', (int)$segments[1]);
        return;
    }

    if (isset($segments[1]) && $segments[0] === 'travailleurs' && is_numeric($segments[1]) && $method === 'PUT') {
        (new App\Controllers\ParametrageController())->updateTravailleur((int)$segments[1]);
        return;
    }
    if (isset($segments[1]) && $segments[0] === 'employeurs' && is_numeric($segments[1]) && $method === 'PUT') {
        (new App\Controllers\ParametrageController())->updateEmployeur((int)$segments[1]);
        return;
    }
    if (isset($segments[1]) && $segments[0] === 'sinistres' && is_numeric($segments[1]) && $method === 'PUT') {
        (new App\Controllers\ParametrageController())->updateSinistre((int)$segments[1]);
        return;
    }

    // ── Auth ─────────────────────────────────────────────────
    if ($segments[0] === 'auth') {
        $ctrl = new App\Controllers\AuthController();
        match([$method, $segments[1] ?? '']) {
            ['POST', 'login']           => $ctrl->login(),
            ['GET',  'me']              => $ctrl->me(),
            ['POST', 'change-password'] => $ctrl->changePassword(),
            default                     => notFound(),
        };

    // ── Réclamations ─────────────────────────────────────────
    } elseif ($segments[0] === 'reclamations') {
        $recCtrl  = new App\Controllers\ReclamationController();
        $valCtrl  = new App\Controllers\ValidationController();
        $actCtrl  = new App\Controllers\ActionController();

        $id  = isset($segments[1]) && is_numeric($segments[1]) ? (int)$segments[1] : null;
        $sub = $segments[2] ?? null;

        if (isset($segments[1]) && $segments[1] === 'history') {
            match($method) {
                'GET'   => $recCtrl->history(),
                default => notFound(),
            };
        } elseif ($id && $sub) {
            match([$method, $sub]) {
                ['PUT',  'statut']    => $recCtrl->updateStatut($id),
                ['PUT',  'analyse']   => $recCtrl->updateAnalyse($id),
                ['PUT',  'remarques'] => $recCtrl->updateRemarques($id),
                ['PUT',  'escalader'] => $recCtrl->escalader($id),
                ['PUT',  'qualify']   => $recCtrl->qualify($id),
                ['POST', 'valider']   => $valCtrl->valider($id),
                ['POST', 'retourner'] => $valCtrl->retourner($id),
                ['POST', 'soumettre'] => $valCtrl->soumettre($id),
                ['GET',  'actions']     => $actCtrl->index($id),
                ['POST', 'actions']     => $actCtrl->create($id),
                ['GET',  'attachments'] => (new App\Controllers\AttachmentController())->list($id),
                ['POST', 'attachments'] => (new App\Controllers\AttachmentController())->upload($id),
                default                 => notFound(),
            };
        } elseif ($id) {
            match($method) {
                'GET'  => $recCtrl->show($id),
                'PUT'  => notFound(), // PUT direct non implémenté
                default=> notFound(),
            };
        } else {
            match($method) {
                'GET'  => $recCtrl->index(),
                'POST' => $recCtrl->create(),
                default=> notFound(),
            };
        }

    // ── Actions (PUT /api/actions/{id}) ───────────────────────
    } elseif ($segments[0] === 'actions') {
        $actCtrl = new App\Controllers\ActionController();
        $id      = isset($segments[1]) ? (int)$segments[1] : null;
        if ($id && $method === 'PUT') {
            $actCtrl->update($id);
        } elseif ($id && $method === 'DELETE') {
            $actCtrl->delete($id);
        } else {
            notFound();
        }

    // ── Pièces Jointes (Direct) ──────────────────────────────
    } elseif ($segments[0] === 'attachments') {
        $ctrl = new App\Controllers\AttachmentController();
        $id   = isset($segments[1]) ? (int)$segments[1] : null;
        if (!$id) notFound();
        match($method) {
            'GET'    => $ctrl->download($id),
            'DELETE' => $ctrl->delete($id),
            default  => notFound(),
        };

    // ── Paramétrage & Administration ──────────────────────────
    } elseif ($segments[0] === 'regimes') {
        $ctrl = new App\Controllers\ParametrageController();
        $id   = isset($segments[1]) ? (int)$segments[1] : null;
        match($method) {
            'GET'    => $ctrl->regimes(),
            'POST'   => $ctrl->createRegime(),
            'PUT'    => $id ? $ctrl->updateRegime($id) : notFound(),
            'DELETE' => $id ? $ctrl->deleteEntity('regimes', $id) : notFound(),
            default  => notFound(),
        };

    } elseif ($segments[0] === 'types-clients') {
        $ctrl = new App\Controllers\ParametrageController();
        $id   = isset($segments[1]) ? (int)$segments[1] : null;
        match($method) {
            'GET'    => $ctrl->typesClients(),
            'POST'   => $ctrl->createTypeClient(),
            'PUT'    => $id ? $ctrl->updateTypeClient($id) : notFound(),
            'DELETE' => $id ? $ctrl->deleteEntity('types_clients', $id) : notFound(),
            default  => notFound(),
        };

    } elseif ($segments[0] === 'categories-causes') {
        $ctrl = new App\Controllers\ParametrageController();
        $id   = isset($segments[1]) ? (int)$segments[1] : null;
        match($method) {
            'GET'    => $ctrl->categoriesCauses(),
            'POST'   => $ctrl->createCategoryCause(),
            'PUT'    => $id ? $ctrl->updateCategoryCause($id) : notFound(),
            'DELETE' => $id ? $ctrl->deleteEntity('categories_causes', $id) : notFound(),
            default  => notFound(),
        };

    } elseif ($segments[0] === 'causes') {
        $ctrl = new App\Controllers\ParametrageController();
        $id   = isset($segments[1]) ? $segments[1] : null;
        
        if ($id === 'import' && $method === 'POST') {
            $ctrl->importCauses();
        } elseif ($id === 'bulk' && $method === 'POST') {
            $ctrl->bulkCauses();
        } else {
            $id = (int)$id;
            match($method) {
                'GET'    => $ctrl->causes(),
                'POST'   => $ctrl->createCause(),
                'PUT'    => $id ? $ctrl->updateCause($id) : notFound(),
                'DELETE' => $id ? $ctrl->deleteEntity('causes', $id) : notFound(),
                default  => notFound(),
            };
        }

    } elseif ($segments[0] === 'interims') {
        App\Middleware\Auth::require(['administrateur']);
        $ctrl = new App\Controllers\InterimController();
        $id = isset($segments[1]) && is_numeric($segments[1]) ? (int)$segments[1] : null;

        match($method) {
            'GET'    => header('Content-Type: application/json'), // Ensure JSON header
            'POST'   => header('Content-Type: application/json'),
            default  => null
        };

        $result = match($method) {
            'GET'    => $ctrl->list(),
            'POST'   => $ctrl->create(),
            'DELETE' => $id ? $ctrl->delete($id) : notFound(),
            'PATCH'  => ($id && ($segments[2] ?? '') === 'toggle') ? $ctrl->toggleStatus($id) : notFound(),
            default  => notFound(),
        };
        echo json_encode($result);

    } elseif ($segments[0] === 'audit') {
        $ctrl = new App\Controllers\AuditController();
        match($method) {
            'GET'    => $ctrl->list(),
            default  => notFound(),
        };

    } elseif ($segments[0] === 'analytics') {
        $ctrl = new App\Controllers\AnalyticsController();
        match($method) {
            'GET'    => $ctrl->getComparativeStats(),
            default  => notFound(),
        };

    } elseif ($segments[0] === 'modes-saisine') {
        $ctrl = new App\Controllers\ParametrageController();
        $id   = isset($segments[1]) ? (int)$segments[1] : null;
        match($method) {
            'GET'    => $ctrl->modesSaisine(),
            'POST'   => $ctrl->createModeSaisine(),
            'PUT'    => $id ? $ctrl->updateModeSaisine($id) : notFound(),
            'DELETE' => $id ? $ctrl->deleteEntity('modes_saisine', $id) : notFound(),
            default  => notFound(),
        };

    } elseif ($segments[0] === 'processus') {
        $ctrl = new App\Controllers\ParametrageController();
        $id   = isset($segments[1]) ? (int)$segments[1] : null;
        match($method) {
            'GET'    => $ctrl->processus(),
            'POST'   => $ctrl->createProcessus(),
            'PUT'    => $id ? $ctrl->updateProcessus($id) : notFound(),
            'DELETE' => $id ? $ctrl->deleteEntity('processus', $id) : notFound(),
            default  => notFound(),
        };

    } elseif ($segments[0] === 'motifs') {
        $ctrl = new App\Controllers\ParametrageController();
        $id   = isset($segments[1]) ? $segments[1] : null;
        
        if ($id === 'bulk' && $method === 'POST') {
            $ctrl->bulkMotifs();
        } else {
            $id = (int)$id;
            match($method) {
                'GET'    => $ctrl->motifs(),
                'POST'   => $ctrl->createMotif(),
                'PUT'    => $id ? $ctrl->updateMotif($id) : notFound(),
                'DELETE' => $id ? $ctrl->deleteEntity('motifs', $id) : notFound(),
                default  => notFound(),
            };
        }

    } elseif ($segments[0] === 'sous-motifs') {
        $ctrl = new App\Controllers\ParametrageController();
        $id   = isset($segments[1]) ? (int)$segments[1] : null;
        match($method) {
            'GET'    => $ctrl->sousMotifs(),
            'POST'   => $ctrl->createSousMotif(),
            'PUT'    => $id ? $ctrl->updateSousMotif($id) : notFound(),
            'DELETE' => $id ? $ctrl->deleteEntity('sous_motifs', $id) : notFound(),
            default  => notFound(),
        };

    } elseif ($segments[0] === 'affectations') {
        $ctrl = new App\Controllers\ParametrageController();
        $id   = isset($segments[1]) ? (int)$segments[1] : null;
        match($method) {
            'GET'    => $ctrl->affectations(),
            'POST'   => $ctrl->createAffectation(),
            'DELETE' => $id ? $ctrl->deleteEntity('affectations_pilotes', $id) : notFound(),
            default  => notFound(),
        };

    } elseif ($segments[0] === 'agences') {
        $ctrl = new App\Controllers\ParametrageController();
        $id   = isset($segments[1]) ? (int)$segments[1] : null;
        match($method) {
            'GET'    => $ctrl->agences(),
            'POST'   => $ctrl->createAgence(),
            'PUT'    => $id ? $ctrl->updateAgence($id) : notFound(),
            'DELETE' => $id ? $ctrl->deleteEntity('agences', $id) : notFound(),
            default  => notFound(),
        };

    } elseif ($segments[0] === 'ressources') {
        $ctrl = new App\Controllers\ParametrageController();
        $id   = isset($segments[1]) ? $segments[1] : null;

        if ($id === 'bulk' && $method === 'POST') {
            $ctrl->bulkRessources();
        } elseif ($id === 'clear-no-account' && $method === 'DELETE') {
            $ctrl->clearRessourcesNoAccount();
        } else {
            $id = (int)$id;
            match($method) {
                'GET'    => $ctrl->listRessources(),
                'POST'   => $ctrl->createRessource(),
                'PUT'    => $id ? $ctrl->updateRessource($id) : notFound(),
                'DELETE' => $id ? $ctrl->deleteEntity('ressources', $id) : notFound(),
                default  => notFound(),
            };
        }

    } elseif ($segments[0] === 'utilisateurs') {
        $ctrl = new App\Controllers\ParametrageController();
        $id   = isset($segments[1]) ? (int)$segments[1] : null;
        match($method) {
            'GET'    => $ctrl->utilisateurs(),
            'POST'   => $ctrl->createUtilisateur(),
            'PUT'    => $id ? $ctrl->updateUtilisateur($id) : notFound(),
            'DELETE' => $id ? $ctrl->deleteEntity('utilisateurs', $id) : notFound(),
            default  => notFound(),
        };

    } elseif ($segments[0] === 'config-mail') {
        $ctrl = new App\Controllers\ConfigMailController();
        $sub  = $segments[1] ?? '';
        match([$method, $sub]) {
            ['GET',  '']     => $ctrl->get(),
            ['POST', '']     => $ctrl->save(),
            ['POST', 'test'] => $ctrl->test(),
            default          => notFound(),
        };

    } elseif ($segments[0] === 'suggestions') {
        $ctrl = new App\Controllers\KnowledgeBaseController();
        $id   = isset($segments[1]) ? (int)$segments[1] : null;
        match($method) {
            'GET'    => $ctrl->index(),
            'POST'   => $ctrl->create(),
            'PUT'    => $id ? $ctrl->update($id) : notFound(),
            'DELETE' => $id ? $ctrl->delete($id) : notFound(),
            default  => notFound(),
        };

    } elseif ($segments[0] === 'kb') {
        $ctrl = new App\Controllers\KnowledgeBaseController();
        $id   = isset($segments[1]) ? (int)$segments[1] : null;
        match($method) {
            'GET'    => $ctrl->listEntries(),
            'POST'   => $ctrl->createEntry(),
            'PUT'    => $id ? $ctrl->updateEntry($id) : notFound(),
            'DELETE' => $id ? $ctrl->deleteEntry($id) : notFound(),
            default  => notFound(),
        };

    } elseif ($segments[0] === 'reclamations' && isset($segments[2]) && $segments[2] === 'suggestions') {
        $ctrl = new App\Controllers\KnowledgeBaseController();
        $id   = (int)$segments[1];
        if ($method === 'GET') $ctrl->getSuggestionsForReclamation($id);
        else notFound();

    } elseif ($segments[0] === 'stats') {
        (new App\Controllers\ParametrageController())->stats();

    } else {
        notFound();
    }

} catch (\Throwable $e) {
    http_response_code(500);
    $debug = getenv('APP_ENV') === 'development';
    echo json_encode([
        'error'  => 'Erreur interne du serveur',
        'detail' => $debug ? $e->getMessage() : null,
        'file'   => $debug ? $e->getFile() . ':' . $e->getLine() : null,
    ]);
}

// ─── Helper 404 ─────────────────────────────────────────────
function notFound(): void {
    http_response_code(404);
    echo json_encode(['error' => 'Route introuvable']);
    exit;
}
