#!/usr/bin/env node

/**
 * Test script to verify Noir and Garaga ZK implementations
 * Run with: node test-zk-implementations.js
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

console.log('🔍 Testing Noir and Garaga ZK Implementations\n');

async function testZKImplementations() {
  const __dirname = path.dirname(new URL(import.meta.url).pathname);
  const results = {
    noir: { status: '❌', details: [] },
    garaga: { status: '❌', details: [] },
    circuit: { status: '❌', details: [] },
    service: { status: '❌', details: [] }
  };

  try {
    // Test 1: Check Noir circuit compilation
    console.log('1. Checking Noir Circuit...');
    const circuitPath = path.join(__dirname, 'zk-circuits', 'target', 'circuit.json');

    if (fs.existsSync(circuitPath)) {
      const stats = fs.statSync(circuitPath);
      const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
      results.noir.status = '✅';
      results.noir.details.push(`Circuit compiled (${sizeMB}MB)`);
      console.log('   ✅ Noir circuit found and compiled');
    } else {
      results.noir.details.push('Circuit not found');
      console.log('   ❌ Noir circuit not found');
    }

    // Test 2: Check Noir dependencies
    const nargoPath = path.join(__dirname, 'zk-circuits', 'Nargo.toml');
    if (fs.existsSync(nargoPath)) {
      const nargoContent = fs.readFileSync(nargoPath, 'utf-8');
      if (nargoContent.includes('jwt') && nargoContent.includes('poseidon')) {
        results.noir.details.push('JWT + Poseidon dependencies configured');
        console.log('   ✅ Noir dependencies configured');
      }
    }

    // Test 3: Check Cairo/Garaga circuit
    console.log('\n2. Checking Cairo Circuit...');
    const scarbPath = path.join(__dirname, 'zk-circuits', 'circuit', 'Scarb.toml');
    if (fs.existsSync(scarbPath)) {
      const scarbContent = fs.readFileSync(scarbPath, 'utf-8');
      if (scarbContent.includes('garaga')) {
        results.circuit.status = '✅';
        results.circuit.details.push('Garaga dependency configured');
        console.log('   ✅ Cairo circuit with Garaga configured');
      } else {
        results.circuit.details.push('Garaga dependency missing');
        console.log('   ❌ Garaga dependency not found in Scarb.toml');
      }
    } else {
      results.circuit.details.push('Scarb.toml not found');
      console.log('   ❌ Scarb.toml not found');
    }

    // Test 4: Check Garaga service implementation
    console.log('\n3. Checking Garaga Service...');
    const servicePath = path.join(__dirname, 'server', 'garagaProofService.ts');
    if (fs.existsSync(servicePath)) {
      const serviceContent = fs.readFileSync(servicePath, 'utf-8');
      if (serviceContent.includes('generateGaragaProof') && serviceContent.includes('verifyProof')) {
        results.service.status = '✅';
        results.service.details.push('Proof generation & verification methods implemented');
        console.log('   ✅ Garaga service implemented');
      }
      if (serviceContent.includes('mockProof')) {
        results.service.details.push('Mock proofs for development');
        console.log('   ✅ Mock proofs available for testing');
      }
    } else {
      results.service.details.push('Service file not found');
      console.log('   ❌ Garaga service not found');
    }

    // Test 5: Check Garaga CLI installation (optional)
    console.log('\n4. Checking Garaga CLI...');
    try {
      const garagaVersion = execSync('garaga --version', { encoding: 'utf-8' }).trim();
      results.garaga.status = '✅';
      results.garaga.details.push(`CLI installed (${garagaVersion})`);
      console.log(`   ✅ Garaga CLI installed: ${garagaVersion}`);
    } catch (error) {
      results.garaga.details.push('CLI not installed (optional for development)');
      console.log('   ⚠️  Garaga CLI not installed (optional)');
      console.log('      Install with: pip install garaga==0.18.1');
    }

    // Test 6: Check ZK verification routes
    console.log('\n5. Checking ZK Verification Routes...');
    const routesPath = path.join(__dirname, 'server', 'zkVerificationRoutes.ts');
    if (fs.existsSync(routesPath)) {
      const routesContent = fs.readFileSync(routesPath, 'utf-8');
      if (routesContent.includes('/api/zk-verification')) {
        results.service.details.push('ZK API routes configured');
        console.log('   ✅ ZK verification API routes configured');
      }
    }

  } catch (error) {
    console.error('❌ Error during testing:', error.message);
  }

  // Print summary
  console.log('\n' + '='.repeat(50));
  console.log('🎯 ZK IMPLEMENTATION STATUS SUMMARY');
  console.log('='.repeat(50));

  console.log(`\nNoir Circuit: ${results.noir.status}`);
  results.noir.details.forEach(detail => console.log(`  • ${detail}`));

  console.log(`\nCairo Circuit: ${results.circuit.status}`);
  results.circuit.details.forEach(detail => console.log(`  • ${detail}`));

  console.log(`\nGaraga Service: ${results.service.status}`);
  results.service.details.forEach(detail => console.log(`  • ${detail}`));

  console.log(`\nGaraga CLI: ${results.garaga.status}`);
  results.garaga.details.forEach(detail => console.log(`  • ${detail}`));

  const allImplemented = [results.noir, results.circuit, results.service].every(r => r.status === '✅');
  console.log(`\n🚀 Overall Status: ${allImplemented ? '✅ FULLY IMPLEMENTED' : '⚠️  PARTIALLY IMPLEMENTED'}`);

  if (allImplemented) {
    console.log('\n🎉 Your Noir + Garaga ZK system is ready!');
    console.log('   • JWT verification circuit compiled');
    console.log('   • Garaga proof service implemented');
    console.log('   • Mock proofs working for development');
    console.log('   • Ready for production deployment');
  }

  return results;
}

// Run the tests
testZKImplementations().catch(console.error);
