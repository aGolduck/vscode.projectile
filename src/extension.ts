
'use strict';

import * as path from 'path';
import * as fs from 'fs';
import * as vscode from 'vscode';
import { workspace } from 'vscode';
import * as cp from 'child_process';
import { getVSCodeDownloadUrl } from 'vscode-test/out/util';
const gitLsFiles = require('git-ls-files')

let projects: any = {};

// copied and modified from https://github.com/banyudu/find-git-root/blob/master/index.js
function findGitRoot(start: any): String {
    if (typeof start === 'string') {
        if (start[start.length - 1] !== path.sep) {
            start += path.sep
        }
        start = path.normalize(start)
        start = start.split(path.sep)
    }
    if (!start.length) {
        throw new Error('.git/ not found in path')
    }
    start.pop()
    var dir = start.join(path.sep)
    var fullPath = path.join(dir, '.git')
    if (fs.existsSync(fullPath)) {
        return path.normalize(fullPath)
    } else {
        return findGitRoot(start)
    }
}

export function activate(context: vscode.ExtensionContext) {
    const stateKey = "projectile"
    const stateKeyCurrentProject = "current-project"
    
    projects = context.globalState.get(stateKey) ? context.globalState.get(stateKey) : {};
    context.globalState.setKeysForSync([stateKey])
    
    const openProjectFiles = (cwd: any) => {
        const files = gitLsFiles({ cwd })
        const projectFiles = vscode.window.createQuickPick()
        projectFiles.items = files.all.map((label: any) => ({ label }))
        projectFiles.canSelectMany = false
        projectFiles.onDidChangeSelection(async (fileItem) => {
            const file = fileItem[0].label
            vscode.window.showInformationMessage(`${file} was selected`)
            projectFiles.hide()
            const doc = await vscode.workspace.openTextDocument(`${cwd}/${file}`)
            vscode.window.showTextDocument(doc)
        })
        projectFiles.show()
        
    }
    vscode.commands.registerCommand('projectile.projectFiles', async () => {
        const root = vscode.window.activeTextEditor ? findGitRoot(vscode.window.activeTextEditor.document.fileName).replace(/\/\.git$/, "") : undefined
        
        if (root) {
            openProjectFiles(root)
        }
    })
    
    vscode.commands.registerCommand('projectile.projects', async () => {
        const quickPick = vscode.window.createQuickPick()
        quickPick.items = Object.keys(projects).map(label => ({ label }))
        quickPick.canSelectMany = false
        quickPick.onDidChangeSelection((e) => {
            openProjectFiles(e[0].label)
            quickPick.hide()
        })
        
        quickPick.show()
    })
    
    vscode.workspace.onDidOpenTextDocument(async (doc: vscode.TextDocument) => {
        if (doc.fileName) {
            try {
                const root = findGitRoot(doc.fileName).replace(/\/\.git$/, "")
                projects[root] = true
                context.globalState.update(stateKey, projects)
                context.workspaceState.update(stateKeyCurrentProject, root)
                vscode.window.showInformationMessage(root)
                workspace.updateWorkspaceFolders(workspace.workspaceFolders ? workspace.workspaceFolders.length : 0, null, { uri: vscode.Uri.file(root) });
            } catch (e) {
            }
        }
    })
}
