// ===============================================================================
// STRATEGY ENGINE API v1.0 (LIQUIDITY POOL MONITORING)
// This service simulates monitoring critical on-chain liquidity pools and uses 
// a FallbackProvider for robust, fault-tolerant RPC connections.
// FIX: Imports FallbackProvider and StaticJsonRpcProvider directly from ethers v6 
// for improved stability and reduced connection log spam from public nodes.
// ===============================================================================

const express = require('express');
const cors = require('cors');
// Import all necessary classes from ethers v6
const { ethers, FallbackProvider, StaticJsonRpcProvider } = require('ethers');

const app = express();
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'OPTIONS'] }));
app.use(express.json());

// Using a specific port for the Strategy Engine
const PORT = process.env.STRATEGY_PORT || 8081;

// ===============================================================================
// CONFIGURATION
// ===============================================================================

const ETHERSCAN_RPC_URL = process.env.ETHERSCAN_RPC_URL;

// RPC ENDPOINTS (The secure URL is prioritized if available)
let RPC_URLS = [
    // Optimization: Move cloudflare-eth.com to the top of the public list for better stability
    'https://cloudflare-eth.com', 
    'https://ethereum-rpc.publicnode.com',
    'https://eth.meowrpc.com',      
    'https://eth.llamarpc.com',
    'https://1rpc.io/eth'
];

if (ETHERSCAN_RPC_URL) {
    RPC_URLS.unshift(ETHERSCAN_RPC_URL);
    console.log("✅ Using secure RPC URL from environment variable for primary connection.");
} else {
    console.log("⚠️ Secure RPC URL not found. Relying solely on public endpoints.");
}


// Simulated Critical Liquidity Pools to Monitor
const LIQUIDITY_POOLS = [
    { name: "Uniswap V3 ETH/USDC", address: "0x88e6A0c2d...7A34bEa" },
    { name: "Curve 3Crv", address: "0xB20b7280A...90515C8" },
    { name: "Aave V3 ETH Market", address: "0x7d2768dEa...1D1e905F" }
];

let provider = null;
let currentBlock = 0;
let monitorStatus = 'initializing';
let lastMonitorRun = null;

// ===============================================================================
// PROVIDER INITIALIZATION WITH FALLBACK
// ===============================================================================

async function initProvider() {
    monitorStatus = 'connecting';
    try {
        // Use StaticJsonRpcProvider to ensure stability and silence unnecessary connection errors 
        const providers = RPC_URLS.map(url => new StaticJsonRpcProvider(url, 'mainnet'));
        
        // Use FallbackProvider for robustness and automatic failover
        const fallbackProvider = new FallbackProvider(providers, 1);
        
        const blockNum = await fallbackProvider.getBlockNumber();
        console.log(`✅ Strategy Engine: Connected to Ethereum Mainnet at block: ${blockNum} using FallbackProvider.`);
        
        provider = fallbackProvider;
        monitorStatus = 'connected';
        return true;
    } catch (e) {
        console.error('❌ Strategy Engine: Failed to connect to all RPC endpoints:', e.message);
        provider = null;
        monitorStatus = 'disconnected';
        return false;
    }
}

// ===============================================================================
// CORE LOGIC: Monitor Pools
// ===============================================================================

async function monitorLiquidityPools() {
    if (!provider) {
        console.warn('⚠️ Strategy Engine: Provider not initialized. Attempting reconnection...');
        await initProvider();
        if (!provider) return;
    }

    try {
        const blockNum = await provider.getBlockNumber();
        currentBlock = blockNum;
        
        // Simulate reading token balances or pool reserves for each critical pool
        const poolData = [];
        for (const pool of LIQUIDITY_POOLS) {
            // Simulate fetching data (e.g., token balance of the pool contract)
            const simulatedReserve = Math.random() * 1000 + 10000; // 10k to 11k simulated reserve
            poolData.push({
                name: pool.name,
                address: pool.address,
                currentReserve: simulatedReserve.toFixed(2) + ' ETH',
                status: simulatedReserve > 10500 ? 'Healthy' : 'Warning'
            });
        }
        
        lastMonitorRun = {
            timestamp: new Date().toISOString(),
            blockNumber: currentBlock,
            poolReports: poolData
        };

        console.log(`[MONITOR SUCCESS] Block: ${blockNum}. ${poolData.length} pools monitored.`);

    } catch (error) {
        console.error('[MONITOR FAILURE] Could not fetch data (RPC error). FallbackProvider should auto-switch.', error.message);
        monitorStatus = 'error';
    }
}

// ===============================================================================
// AUTO-MONITOR START
// ===============================================================================

function startAutoMonitor() {
    console.log(`⏱️ Strategy Engine: Starting auto-monitor. Running every 10 seconds...`);
    // Run monitoring every 10 seconds
    setInterval(monitorLiquidityPools, 10000);  
    monitorLiquidityPools();
}

// ===============================================================================
// STATUS & HEALTH ENDPOINTS
// ===============================================================================

app.get('/', (req, res) => {
    res.json({
        name: 'Strategy Engine API',
        version: '1.0.0',
        status: monitorStatus,
        mode: `Liquidity Pool Monitoring (Rate: 10s)`,
        currentBlock: currentBlock
    });
});

app.get('/liquidity-status', async (req, res) => {
    res.json({
        status: monitorStatus,
        blockchainConnection: provider ? 'robust_connected' : 'disconnected',
        currentBlock: currentBlock,
        lastReport: lastMonitorRun,
        monitoredPoolsCount: LIQUIDITY_POOLS.length,
        timestamp: new Date().toISOString()
    });
});


// ===============================================================================
// START SERVER
// ===============================================================================

initProvider().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 Strategy Engine API v1.0 listening on port ${PORT}`);
        // Start the automated monitoring loop after the server is listening
        startAutoMonitor();
    });
});
