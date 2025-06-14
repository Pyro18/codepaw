import * as assert from 'assert';
import * as vscode from 'vscode';
import { SyncManager } from '../syncManager';
import { PetManager } from '../petManager';

suite('Sync Manager Tests', () => {
  let syncManager: SyncManager;
  let context: vscode.ExtensionContext;

  suiteSetup(() => {
    // Crea un mock context per i test
    context = {
      globalState: {
        get: () => undefined,
        update: () => Promise.resolve(),
        keys: () => []
      },
      subscriptions: [],
      extensionUri: vscode.Uri.parse('test://test'),
      extensionPath: '/test',
      storagePath: '/test/storage',
      globalStoragePath: '/test/global',
      logPath: '/test/log',
      workspaceState: {
        get: () => undefined,
        update: () => Promise.resolve(),
        keys: () => []
      },
      secrets: {
        get: () => Promise.resolve(undefined),
        store: () => Promise.resolve(),
        delete: () => Promise.resolve()
      },
      environmentVariableCollection: {
        persistent: true,
        replace: () => { },
        append: () => { },
        prepend: () => { },
        get: () => undefined,
        forEach: () => { },
        delete: () => { },
        clear: () => { }
      },
      asAbsolutePath: (path: string) => path,
      storageUri: vscode.Uri.parse('test://storage'),
      globalStorageUri: vscode.Uri.parse('test://global'), logUri: vscode.Uri.parse('test://log'),
      extensionMode: vscode.ExtensionMode.Test
    } as unknown as vscode.ExtensionContext;
  });

  setup(() => {
    syncManager = new SyncManager(context);
  });

  test('SyncManager should initialize without errors', () => {
    assert.ok(syncManager);
  });

  test('getSyncStatus should return not configured initially', async () => {
    const status = await syncManager.getSyncStatus();
    assert.strictEqual(status.configured, false);
  });

  test('uploadData should fail without token', async () => {
    const petManager = new PetManager(context);
    const petData = petManager.getPetData();

    const result = await syncManager.uploadData(petData);
    assert.strictEqual(result, false);
  });

  test('downloadData should fail without token', async () => {
    const result = await syncManager.downloadData();
    assert.strictEqual(result, null);
  });
});

suite('Pet Manager Sync Integration Tests', () => {
  let petManager: PetManager;
  let context: vscode.ExtensionContext;

  suiteSetup(() => {
    // Mock context come sopra
    context = {
      globalState: {
        get: () => undefined,
        update: () => Promise.resolve(),
        keys: () => []
      },
      subscriptions: [],
      extensionUri: vscode.Uri.parse('test://test'),
      extensionPath: '/test',
      storagePath: '/test/storage',
      globalStoragePath: '/test/global',
      logPath: '/test/log',
      workspaceState: {
        get: () => undefined,
        update: () => Promise.resolve(),
        keys: () => []
      },
      secrets: {
        get: () => Promise.resolve(undefined),
        store: () => Promise.resolve(),
        delete: () => Promise.resolve()
      },
      environmentVariableCollection: {
        persistent: true,
        replace: () => { },
        append: () => { },
        prepend: () => { },
        get: () => undefined,
        forEach: () => { },
        delete: () => { },
        clear: () => { }
      },
      asAbsolutePath: (path: string) => path,
      storageUri: vscode.Uri.parse('test://storage'),
      globalStorageUri: vscode.Uri.parse('test://global'), logUri: vscode.Uri.parse('test://log'),
      extensionMode: vscode.ExtensionMode.Test
    } as unknown as vscode.ExtensionContext;
  });

  setup(() => {
    petManager = new PetManager(context);
  });

  test('PetManager should initialize with sync manager', () => {
    assert.ok(petManager);
  });

  test('Sync methods should be available', async () => {
    // Testa che i metodi esistano
    assert.ok(typeof petManager.setupSync === 'function');
    assert.ok(typeof petManager.syncToCloud === 'function');
    assert.ok(typeof petManager.syncFromCloud === 'function');
    assert.ok(typeof petManager.getSyncStatus === 'function');
    assert.ok(typeof petManager.resetSync === 'function');
  });

  test('getSyncStatus should work', async () => {
    const status = await petManager.getSyncStatus();
    assert.ok(status);
    assert.ok(typeof status.configured === 'boolean');
  });
});
