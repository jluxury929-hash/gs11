// ===============================================================================
// STRATEGY ENGINE API v1.0 (LIQUIDITY POOL MONITORING)
// This service simulates monitoring critical on-chain liquidity pools and uses 
// a FallbackProvider for robust, fault-tolerant RPC connections.
// ===============================================================================

const express = require('express');
const cors = require('cors');
const { ethers } = require('ethers');

const app = express();
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'OPTIONS'] }));
app.use(express.json());

const PORT = process.env.STRATEGY_PORT || 8081;

// ===============================================================================
// CONFIGURATION
// ===============================================================================

// Check for a dedicated, stable RPC URL via environment variable (Recommended for stability)
// You would set this variable in your deployment environment, e.g.,
// ETHERSCAN_API_KEY=YourEtherscanKeyHere
// ETHERSCAN_RPC_URL=https://mainnet.eth.blockscan.com/rpc/{YourEtherscanKey}

const ETHERSCAN_RPC_URL = process.env.ETHERSCAN_RPC_URL;

// RPC ENDPOINTS (The secure URL is prioritized if available)
let RPC_URLS = [
    // Standard Public Endpoints (used as fallbacks)
    'https://ethereum-rpc.publicnode.com',
    'https://cloudflare-eth.com',
    'https://eth.meowrpc.com',     
    'https://eth.llamarpc.com',
    'https://1rpc.io/eth'
];

if (ETHERSCAN_RPC_URL) {
    // If a stable, dedicated URL is provided, put it first for the FallbackProvider to prefer it.
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
// PROVIDER INITIALIZATION WITH FALLBACK (The requested robust implementation)
// ===============================================================================

async function initProvider() {
    monitorStatus = 'connecting';
    try {
        // Explicitly use 'mainnet' for improved network detection stability
        const providers = RPC_URLS.map(url => new ethers.JsonRpcProvider(url, 'mainnet'));
        
        // Use FallbackProvider for robustness and automatic failover
        const fallbackProvider = new ethers.FallbackProvider(providers, 1);
        
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
