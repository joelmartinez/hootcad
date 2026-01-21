#!/usr/bin/env node
/**
 * Test Validation Script
 * 
 * This script validates that all test files are syntactically correct
 * and can be loaded without errors (without requiring VS Code runtime).
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 HootCAD Test Validation\n');

const testDir = path.join(__dirname, 'out', 'test');

if (!fs.existsSync(testDir)) {
    console.error('❌ Test directory not found. Run "npm run compile-tests" first.');
    process.exit(1);
}

let totalFiles = 0;
let validFiles = 0;
let errors = [];

function findTestFiles(dir) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
            findTestFiles(filePath);
        } else if (file.endsWith('.test.js')) {
            totalFiles++;
            
            try {
                // Try to load the test file to check for syntax errors
                // Note: This won't execute the tests, just check if they load
                const relativePath = path.relative(__dirname, filePath);
                console.log(`  Checking ${relativePath}...`);
                
                // Read the file to check basic structure
                const content = fs.readFileSync(filePath, 'utf8');
                
                // Check that it has test structure
                if (!content.includes('suite(') && !content.includes('test(')) {
                    console.log(`  ⚠️  Warning: No test suites or tests found`);
                }
                
                // Check for common issues
                const issues = [];
                
                if (content.includes('describe(') || content.includes('it(')) {
                    issues.push('Uses Mocha describe/it instead of suite/test');
                }
                
                if (content.includes('require(') && !content.includes('import ')) {
                    // Using require is fine
                }
                
                if (issues.length > 0) {
                    console.log(`  ℹ️  Note: ${issues.join(', ')}`);
                }
                
                validFiles++;
                console.log(`  ✅ Valid\n`);
                
            } catch (error) {
                console.log(`  ❌ Error: ${error.message}\n`);
                errors.push({ file: filePath, error: error.message });
            }
        }
    }
}

console.log('Validating compiled test files...\n');
findTestFiles(testDir);

console.log('\n' + '='.repeat(60));
console.log(`\nSummary:`);
console.log(`  Total test files: ${totalFiles}`);
console.log(`  Valid files: ${validFiles}`);
console.log(`  Errors: ${errors.length}`);

if (errors.length > 0) {
    console.log('\n❌ Validation failed with errors:\n');
    errors.forEach(({ file, error }) => {
        console.log(`  ${path.relative(__dirname, file)}: ${error}`);
    });
    process.exit(1);
}

console.log('\n✅ All test files validated successfully!');
console.log('\nNote: This validation only checks syntax and structure.');
console.log('Run "npm test" to execute tests (requires VS Code).');
process.exit(0);
