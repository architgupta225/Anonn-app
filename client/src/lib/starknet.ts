import { Abi, Account, Contract, Provider, RpcProvider, shortString, num, cairo } from 'starknet';

// Minimal shape to pull from Dynamic user context at runtime without tight coupling
export type DynamicStarknetSigner = {
	getStarknetWallet?: () => Promise<{ account?: Account | null } | null> | { account?: Account | null } | null;
};

// Configure these via env
const RPC_URL = import.meta.env.VITE_STARKNET_RPC_URL || 'https://free-rpc.nethermind.io/sepolia-juno';
const CONTRACT_ADDRESS = (import.meta.env.VITE_ANONN_CONTRACT_ADDRESS || '').trim();
const USDC_ADDRESS = (import.meta.env.VITE_STARKNET_USDC_ADDRESS || '').trim();

// ABI: Updated to match the new comprehensive Anonn reputation market contract
export const ANONN_ABI: Abi = [
	// Core company functions
	{ type: 'function', name: 'get_company', inputs: [{ name: 'company_id', type: 'core::integer::u256' }], outputs: [{ type: '(@core::integer::u256,@core::integer::u256,@core::integer::u256,@core::integer::u256,@core::integer::u256,core::integer::i32,bool,bool,core::integer::u64)' }] },
	{ type: 'function', name: 'get_company_metadata', inputs: [{ name: 'company_id', type: 'core::integer::u256' }], outputs: [{ type: '(core::felt252,core::felt252,core::felt252,core::starknet::contract_address::ContractAddress,core::integer::u64,bool,core::integer::u256)' }] },
	{ type: 'function', name: 'get_company_info', inputs: [{ name: 'company_id', type: 'core::integer::u256' }], outputs: [{ type: '(core::felt252,core::starknet::contract_address::ContractAddress,core::integer::u64,bool,core::integer::u256)' }] },
	
	// Investment functions
	{ type: 'function', name: 'invest_in_company', inputs: [{ name: 'company_id', type: 'core::integer::u256' }, { name: 'side', type: 'menaxa::lib::PositionSide' }, { name: 'amount', type: 'core::integer::u256' }], outputs: [] },
	{ type: 'function', name: 'invest_with_slippage', inputs: [{ name: 'company_id', type: 'core::integer::u256' }, { name: 'side', type: 'menaxa::lib::PositionSide' }, { name: 'amount', type: 'core::integer::u256' }, { name: 'min_shares', type: 'core::integer::u256' }], outputs: [] },
	{ type: 'function', name: 'withdraw_position', inputs: [{ name: 'company_id', type: 'core::integer::u256' }, { name: 'side', type: 'menaxa::lib::PositionSide' }, { name: 'percentage', type: 'core::integer::u256' }], outputs: [] },
	
	// View functions
	{ type: 'function', name: 'get_share_prices', inputs: [{ name: 'company_id', type: 'core::integer::u256' }], outputs: [{ type: '(core::integer::u256,core::integer::u256)' }] },
	{ type: 'function', name: 'get_reputation_score', inputs: [{ name: 'company_id', type: 'core::integer::u256' }], outputs: [{ type: 'core::integer::i32' }] },
	{ type: 'function', name: 'get_user_position', inputs: [{ name: 'user', type: 'core::starknet::contract_address::ContractAddress' }, { name: 'company_id', type: 'core::integer::u256' }], outputs: [{ type: '(core::integer::u256,core::integer::u256,core::integer::u256,core::integer::u256,core::integer::u64,core::integer::u64)' }] },
	{ type: 'function', name: 'get_position_value', inputs: [{ name: 'user', type: 'core::starknet::contract_address::ContractAddress' }, { name: 'company_id', type: 'core::integer::u256' }], outputs: [{ type: '(core::integer::u256,core::integer::u256)' }] },
	{ type: 'function', name: 'get_detailed_position_value', inputs: [{ name: 'user', type: 'core::starknet::contract_address::ContractAddress' }, { name: 'company_id', type: 'core::integer::u256' }], outputs: [{ type: '(core::integer::u256,core::integer::u256,core::integer::u256,core::integer::u256,core::integer::u256,core::integer::u256)' }] },
	
	// Company discovery
	{ type: 'function', name: 'get_all_companies', inputs: [], outputs: [{ type: 'core::array::Array::<core::integer::u256>' }] },
	{ type: 'function', name: 'get_active_companies', inputs: [], outputs: [{ type: 'core::array::Array::<core::integer::u256>' }] },
	{ type: 'function', name: 'get_companies_with_activity', inputs: [], outputs: [{ type: 'core::array::Array::<core::integer::u256>' }] },
	{ type: 'function', name: 'get_active_companies_count', inputs: [], outputs: [{ type: 'core::integer::u256' }] },
	
	// User portfolio
	{ type: 'function', name: 'get_user_total_portfolio_value', inputs: [{ name: 'user', type: 'core::starknet::contract_address::ContractAddress' }], outputs: [{ type: 'core::integer::u256' }] },
	{ type: 'function', name: 'get_user_position_count', inputs: [{ name: 'user', type: 'core::starknet::contract_address::ContractAddress' }], outputs: [{ type: 'core::integer::u256' }] },
	{ type: 'function', name: 'get_user_profit_loss', inputs: [{ name: 'user', type: 'core::starknet::contract_address::ContractAddress' }, { name: 'company_id', type: 'core::integer::u256' }], outputs: [{ type: '(core::integer::u256,bool,core::integer::u256,bool)' }] },
	
	// Analytics
	{ type: 'function', name: 'get_24h_volume', inputs: [{ name: 'company_id', type: 'core::integer::u256' }], outputs: [{ type: 'core::integer::u256' }] },
	{ type: 'function', name: 'get_reputation_trend', inputs: [{ name: 'company_id', type: 'core::integer::u256' }, { name: 'days', type: 'core::integer::u64' }], outputs: [{ type: 'core::array::Array::<core::integer::i32>' }] },
	{ type: 'function', name: 'get_platform_total_volume', inputs: [], outputs: [{ type: 'core::integer::u256' }] },
	{ type: 'function', name: 'get_platform_tvl', inputs: [], outputs: [{ type: 'core::integer::u256' }] },
	{ type: 'function', name: 'get_company_depth', inputs: [{ name: 'company_id', type: 'core::integer::u256' }], outputs: [{ type: '(core::integer::u256,core::integer::u256,core::integer::u256,core::integer::u256)' }] },
	
	// Simulation/prediction
	{ type: 'function', name: 'simulate_investment_impact', inputs: [{ name: 'company_id', type: 'core::integer::u256' }, { name: 'side', type: 'menaxa::lib::PositionSide' }, { name: 'amount', type: 'core::integer::u256' }], outputs: [{ type: '(core::integer::u256,core::integer::u256,core::integer::i32)' }] },
	{ type: 'function', name: 'get_expected_shares', inputs: [{ name: 'company_id', type: 'core::integer::u256' }, { name: 'side', type: 'menaxa::lib::PositionSide' }, { name: 'amount', type: 'core::integer::u256' }], outputs: [{ type: 'core::integer::u256' }] },
	{ type: 'function', name: 'calculate_price_impact', inputs: [{ name: 'company_id', type: 'core::integer::u256' }, { name: 'amount', type: 'core::integer::u256' }, { name: 'is_positive', type: 'core::bool' }], outputs: [{ type: 'core::integer::u256' }] },
	{ type: 'function', name: 'get_expected_payout', inputs: [{ name: 'company_id', type: 'core::integer::u256' }, { name: 'amount', type: 'core::integer::u256' }, { name: 'is_positive', type: 'core::bool' }], outputs: [{ type: 'core::integer::u256' }] },
	
	// Admin functions
	{ type: 'function', name: 'create_company', inputs: [{ name: 'name', type: 'core::felt252' }, { name: 'category', type: 'core::felt252' }, { name: 'description', type: 'core::felt252' }], outputs: [{ type: 'core::integer::u256' }] },
	{ type: 'function', name: 'set_platform_fee', inputs: [{ name: 'fee_bps', type: 'core::integer::u256' }], outputs: [] },
	{ type: 'function', name: 'set_fee_recipient', inputs: [{ name: 'new_recipient', type: 'core::starknet::contract_address::ContractAddress' }], outputs: [] },
	{ type: 'function', name: 'set_investment_limits', inputs: [{ name: 'min_investment', type: 'core::integer::u256' }, { name: 'max_investment', type: 'core::integer::u256' }], outputs: [] },
	{ type: 'function', name: 'pause_company', inputs: [{ name: 'company_id', type: 'core::integer::u256' }, { name: 'paused', type: 'core::bool' }], outputs: [] },
	{ type: 'function', name: 'set_company_active_status', inputs: [{ name: 'company_id', type: 'core::integer::u256' }, { name: 'is_active', type: 'core::bool' }], outputs: [] },
	{ type: 'function', name: 'collect_fees', inputs: [], outputs: [] },
	
	// Emergency functions
	{ type: 'function', name: 'emergency_pause_all', inputs: [], outputs: [] },
	{ type: 'function', name: 'emergency_unpause_all', inputs: [], outputs: [] },
	{ type: 'function', name: 'pause', inputs: [], outputs: [] },
	{ type: 'function', name: 'unpause', inputs: [], outputs: [] },
];

export function getProvider(): Provider {
	return new RpcProvider({ nodeUrl: RPC_URL });
}

export function getContractReadonly() {
	if (!CONTRACT_ADDRESS) throw new Error('VITE_ANONN_CONTRACT_ADDRESS not set');
	const provider = getProvider();
	return new Contract(ANONN_ABI as Abi, CONTRACT_ADDRESS, provider);
}

export async function getSignerAccount(dynamic?: DynamicStarknetSigner): Promise<Account | null> {
	try {
		if (!dynamic?.getStarknetWallet) return null;
		const w = await dynamic.getStarknetWallet();
		return (w && w.account) ? w.account : null;
	} catch {
		return null;
	}
}

export function toU256(amountWei: string | bigint | number) {
	const bn = BigInt(amountWei as any);
	const low = Number(bn & ((BigInt(1) << BigInt(128)) - BigInt(1)));
	const high = Number(bn >> BigInt(128));
	return { low, high } as any;
}

export function parseU256(u: any): bigint {
	if (typeof u === 'bigint') return u;
	if (typeof u === 'number') return BigInt(u);
	if (typeof u?.low !== 'undefined' && typeof u?.high !== 'undefined') {
		return (BigInt(u.high) << BigInt(128)) + BigInt(u.low);
	}
	if (typeof u === 'string') return BigInt(u);
	return BigInt(0);
}

export function parseFeltToString(f: any): string {
	try { return shortString.decodeShortString(num.toHex(f)); } catch { return String(f); }
}

// Position side enum to match the contract
export enum PositionSide {
	Positive = 0,
	Negative = 1,
}

// Helper functions for working with the new contract
export async function getContractWithAccount(account: Account) {
	if (!CONTRACT_ADDRESS) throw new Error('VITE_ANONN_CONTRACT_ADDRESS not set');
	return new Contract(ANONN_ABI as Abi, CONTRACT_ADDRESS, account);
}

// Investment functions
export async function investInCompany(
	account: Account,
	companyId: bigint,
	side: PositionSide,
	amount: bigint
) {
	const contract = await getContractWithAccount(account);
	return contract.invest_in_company(companyId, side, toU256(amount));
}

export async function investWithSlippage(
	account: Account,
	companyId: bigint,
	side: PositionSide,
	amount: bigint,
	minShares: bigint
) {
	const contract = await getContractWithAccount(account);
	return contract.invest_with_slippage(companyId, side, toU256(amount), toU256(minShares));
}

export async function withdrawPosition(
	account: Account,
	companyId: bigint,
	side: PositionSide,
	percentage: bigint
) {
	const contract = await getContractWithAccount(account);
	return contract.withdraw_position(companyId, side, toU256(percentage));
}

// View functions
export async function getCompany(companyId: bigint) {
	const contract = getContractReadonly();
	return contract.get_company(companyId);
}

export async function getCompanyMetadata(companyId: bigint) {
	const contract = getContractReadonly();
	return contract.get_company_metadata(companyId);
}

export async function getActiveCompanies() {
	const contract = getContractReadonly();
	return contract.get_active_companies();
}

export async function getSharePrices(companyId: bigint) {
	const contract = getContractReadonly();
	return contract.get_share_prices(companyId);
}

export async function getReputationScore(companyId: bigint) {
	const contract = getContractReadonly();
	return contract.get_reputation_score(companyId);
}

export async function getUserPosition(userAddress: string, companyId: bigint) {
	const contract = getContractReadonly();
	return contract.get_user_position(userAddress, companyId);
}

export async function getPositionValue(userAddress: string, companyId: bigint) {
	const contract = getContractReadonly();
	return contract.get_position_value(userAddress, companyId);
}

export async function getUserPortfolioValue(userAddress: string) {
	const contract = getContractReadonly();
	return contract.get_user_total_portfolio_value(userAddress);
}

// Simulation functions
export async function simulateInvestmentImpact(
	companyId: bigint,
	side: PositionSide,
	amount: bigint
) {
	const contract = getContractReadonly();
	return contract.simulate_investment_impact(companyId, side, toU256(amount));
}

export async function getExpectedShares(
	companyId: bigint,
	side: PositionSide,
	amount: bigint
) {
	const contract = getContractReadonly();
	return contract.get_expected_shares(companyId, side, toU256(amount));
}

export async function calculatePriceImpact(
	companyId: bigint,
	amount: bigint,
	isPositive: boolean
) {
	const contract = getContractReadonly();
	return contract.calculate_price_impact(companyId, toU256(amount), isPositive);
}

export const addresses = {
	contract: CONTRACT_ADDRESS,
	usdc: USDC_ADDRESS,
};