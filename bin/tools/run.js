#!/usr/bin/env node

const { program } = require('commander');
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
// 使用最新的 Web3 版
const { Web3 }= require('web3');  // 如果你使用的是 CommonJS 模块导入方式
const NODE_URL="https://stake.juhaowu.cn"
// 创建 Web3 实例并连接到你的以太坊节点
const web3 = new Web3(NODE_URL); // 替换为你的私链地址
//全局变量部分

// 创建与自建节点连接的ethers provider
const provider = new ethers.JsonRpcProvider(NODE_URL);
const CANDIDATE_HUB_ADDR = '0x0000000000000000000000000000000000001005'; // 替换为你的 CandidateHub 合约地址
const VALIDATOR_CONTRACT_ADDR = '0x0000000000000000000000000000000000001000';
const PASSWORD = 'atoshi'; // 替换为你的 keystore 密码
const CANDIDATE_HUB_ABI = [
    //函数从合约里面获取
  "function register(address consensusAddr, address payable feeAddr, uint32 commissionThousandths) external payable",
  "function requiredMargin() external view returns (uint256)",
  "function getCandidates() external view returns (address[] memory)"

];
const VALIDATOR_CONTRACT_ABI = [
    "function getValidators() external view returns (address[] memory)",
  //     // 基本变量
  // "function blockReward() view returns (uint256)",
  // "function blockRewardIncentivePercent() view returns (uint256)",
  // "function totalInCome() view returns (uint256)",
  
  // // 验证者数组
  // "function currentValidatorSet(uint256) view returns (address, address, address, uint256, uint256)",
  // "function currentValidatorSetLength() view returns (uint256)",
  
  // // 映射
  // "function currentValidatorSetMap(address) view returns (uint256)"
];
// 合约ABI
const abi=require("../../abi/ValidatorSet.json")


//下面是命令行参数部分
program
  .version('0.0.1')
  .description('一个用来和链交互的工具');

program
  .command('register <privateKeyPath> <tokenRegisteCount>')
  .description('注册某地址为Candidate')
  .action((privateKeyPath,tokenRegisteCount) => {
    registerCandidate(NODE_URL,privateKeyPath,tokenRegisteCount);
  });

program
  .command('getblockhight ')
  .description('获取区块高度')
  .action(() => {
    getBlockHeight();
  });

program
  .command('getcandidates ')
  .description('获取Candidates')
  .action(() => {
    getCandidates();
  });

program
  .command('getvalidators ')
  .description('获取Validators')
  .action(() => {
    getValidators();
  });

program
  .command('getvalidatorinfo <index>')
  .description('获取某个Validator的信息')
  .action((index) => {
    getValidatorInfo(index);
  });

program
  .command('send <keyPath> <toAaddr> <amountToSend> ')
  .description('转账，参数为：keystore路径-接收地址-转账数量')
  .action((keyPath,toAaddr,amountToSend) => {
    translate(keyPath,toAaddr,amountToSend);
  });

program.parse(process.argv);
// 确保你的 package.json 中有 "bin": "./run.js" (或其他你脚本的名称)


//下面是相关函数部分
// 提取私钥并创建钱包对象
async function getWallet(NODE_URL,publicKeyPath) {
  try {
    const KEYSTORE_PATH = path.join(__dirname, publicKeyPath); //
    const keystoreJson = fs.readFileSync(KEYSTORE_PATH, 'utf8');
    const wallet = await ethers.Wallet.fromEncryptedJson(keystoreJson, PASSWORD);
    const provider = new ethers.JsonRpcProvider(NODE_URL);

    try {
      // 获取当前区块高度
      const blockNumber = await provider.getBlockNumber();
      console.log('当前区块高度:', blockNumber);
    } catch (error) {
      console.error('获取区块高度时出错:', error);
    }
    console.log("钱包私钥：",wallet.privateKey);
    return wallet.connect(provider);
  } catch (error) {
    console.error('解密 keystore 文件失败:', error);
  }
}
// 注册候选人
async function registerCandidate(NODE_URL,privateKeyPath,tokenRegisteCount) {
  console.log('接收到的钱包私钥地址:', privateKeyPath);
  console.log('接收到的节点 RPC 地址:', NODE_URL);
  console.log('注册质押代币:',tokenRegisteCount)

  try {
    const wallet = await getWallet(NODE_URL, privateKeyPath);
    if (!wallet) {
      throw new Error('无法获取钱包对象');
    }

    const contract = new ethers.Contract(CANDIDATE_HUB_ADDR, CANDIDATE_HUB_ABI, wallet);

    const walletAddress = await wallet.getAddress();
    console.log('钱包地址:', walletAddress);
    // 替换以下参数为实际值
    const consensusAddr = walletAddress; // 替换为共识地址
    const feeAddr = walletAddress; // 替换为费用地址
    const commissionThousandths = 50; // 替换为实际的佣金千分比
    console.log('consensusAddresses:', consensusAddr);
    console.log('feeAddr:', feeAddr);
    console.log('commissionThousandths:', commissionThousandths);
    console.log("###############");
    // 从合约中读取所需的押金
    const requiredMargin = await contract.requiredMargin();
    console.log('所需的押金:', requiredMargin);

    // 调用 register 方法
    const tx = await contract.register(consensusAddr, feeAddr, commissionThousandths,{value:ethers.parseEther(tokenRegisteCount)});

    console.log('交易发送中...');
    const receipt=await tx.wait(); // 等待交易确认
    console.log('注册成功！');

    console.log('交易哈希:', tx.hash);
    console.log('交易确认块号:', receipt.blockNumber);
    console.log('交易确认时间:', receipt.timestamp);

  } catch (error) {
    console.error('注册失败:', error);
  }
}

async function getBlockHeight() {
    try {
      // 获取当前区块高度
      const blockNumber = await provider.getBlockNumber();
      console.log('当前区块高度:', blockNumber);
    } catch (error) {
      console.error('获取区块高度时出错:', error);
    }
  }

async function getCandidates() {
    const contract = new ethers.Contract(CANDIDATE_HUB_ADDR, CANDIDATE_HUB_ABI, provider);
    const candidadtes=await contract.getCandidates();
    console.log("candidates:",candidadtes);

}

async function getValidators() {
    const contract = new ethers.Contract(VALIDATOR_CONTRACT_ADDR, VALIDATOR_CONTRACT_ABI, provider);
    const validators=await contract.getValidators();
    console.log("Validators:",validators);

}

async function getValidatorInfo(index) {
  
// 创建合约实例
const contract = new web3.eth.Contract(abi, VALIDATOR_CONTRACT_ADDR);
try {
  const validator = await contract.methods.currentValidatorSet(index).call();
  console.log(validator);
} catch (error) {
  console.error(`Error getting validator at index ${index}:`, error);
  throw error;
}
}


async function translate(keyPath,toAaddr,amountToSend) {
    console.log('接收到的钱包私钥地址:', keyPath);
    console.log('接收到的节点 RPC 地址:', NODE_URL);
    console.log('转账数量:',amountToSend)
  
    try {
      const wallet = await getWallet(NODE_URL, keyPath);
      if (!wallet) {
        throw new Error('无法获取钱包对象');
      }
    // 3. 获取发送者的地址 (可选，用于日志记录)
    const senderAddress = await wallet.getAddress();
    console.log("发送者地址:", senderAddress);

    // 4. 构建交易对象
    const tx = {
        to: toAaddr,
        value: ethers.parseEther(amountToSend), // 将 ETH 转换为 Wei
        gasLimit: 21000, // 基础转账的 gasLimit
    };

    // 5. 估算 Gas Price (推荐)
    const gasPrice = await provider.getRpcRequest("getGasPrice");
    tx.gasPrice = gasPrice;

    console.log("发送交易...");

    // 6. 发送交易并等待交易被确认
    const transactionResponse = await wallet.sendTransaction(tx);
    console.log("交易哈希:", transactionResponse.hash);

    const transactionReceipt = await transactionResponse.wait();
    console.log("交易已确认，区块号:", transactionReceipt.blockNumber);
    console.log("交易详情:", transactionReceipt);

    if (transactionReceipt.status === 1) {
        console.log("转账成功!");
    } else {
        console.error("转账失败.");
    }

    } catch (error) {
        console.error('转账失败:', error);
      }
}
