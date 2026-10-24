#!/usr/bin/env node
/**
 * Fotolism - Google Stitch MCP Sync & Automation CLI
 * Allows interacting with Stitch MCP server (https://stitch.googleapis.com/mcp)
 * directly from terminal or scripts.
 */

import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';

const API_KEY = process.env.STITCH_API_KEY || '';
const MCP_ENDPOINT = 'https://stitch.googleapis.com/mcp';

async function callMcp(method, params = {}) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method,
      params
    });

    const req = https.request(MCP_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': API_KEY,
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          if (json.error) {
            reject(new Error(`MCP Error ${json.error.code}: ${json.error.message}`));
          } else {
            resolve(json.result);
          }
        } catch (err) {
          reject(new Error(`Invalid JSON response: ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function callTool(name, args = {}) {
  const result = await callMcp('tools/call', {
    name,
    arguments: args
  });
  if (result.content && result.content[0] && result.content[0].text) {
    try {
      return JSON.parse(result.content[0].text);
    } catch {
      return result.content[0].text;
    }
  }
  return result;
}

const command = process.argv[2] || 'help';
const arg1 = process.argv[3];
const arg2 = process.argv[4];

async function main() {
  try {
    switch (command) {
      case 'tools': {
        const tools = await callMcp('tools/list', {});
        console.log('Available Stitch MCP Tools:');
        tools.tools.forEach(t => console.log(`  - ${t.name}: ${t.description.split('\n')[0]}`));
        break;
      }

      case 'list-projects': {
        const res = await callTool('list_projects', {});
        console.log('Stitch Projects:');
        const projects = res.projects || [];
        projects.forEach(p => {
          console.log(`  • [${p.name}] ${p.title} (${p.visibility || 'PRIVATE'})`);
        });
        break;
      }

      case 'list-screens': {
        if (!arg1) {
          console.error('Usage: stitch-cli list-screens <projectId>');
          process.exit(1);
        }
        const projectId = arg1.replace('projects/', '');
        const res = await callTool('list_screens', { projectId });
        console.log(`Screens in project ${projectId}:`);
        const screens = res.screens || [];
        screens.forEach(s => {
          console.log(`  • ID: ${s.name.split('/').pop()} | Title: "${s.title}" | Device: ${s.deviceType} (${s.width}x${s.height})`);
        });
        break;
      }

      case 'get-project': {
        if (!arg1) {
          console.error('Usage: stitch-cli get-project <projectId>');
          process.exit(1);
        }
        const name = arg1.startsWith('projects/') ? arg1 : `projects/${arg1}`;
        const res = await callTool('get_project', { name });
        console.log(JSON.stringify(res, null, 2));
        break;
      }

      case 'upload-design': {
        const targetProjectId = (arg1 || '1538746746964596560').replace('projects/', '');
        const filePath = arg2 || 'DESIGN.md';
        const content = fs.readFileSync(path.resolve(process.cwd(), filePath), 'utf8');
        const base64Content = Buffer.from(content, 'utf8').toString('base64');
        console.log(`Uploading ${filePath} to project ${targetProjectId}...`);
        const res = await callTool('upload_design_md', {
          projectId: targetProjectId,
          designMdBase64: base64Content
        });
        console.log('Upload result:', res);
        break;
      }

      default:
        console.log(`Fotolism Stitch CLI
Usage:
  node scripts/stitch-cli.mjs tools
  node scripts/stitch-cli.mjs list-projects
  node scripts/stitch-cli.mjs list-screens <projectId>
  node scripts/stitch-cli.mjs get-project <projectId>
  node scripts/stitch-cli.mjs upload-design [projectId] [filePath]
`);
    }
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();
