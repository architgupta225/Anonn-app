import { Abi, Account, Contract, Provider, RpcProvider } from 'starknet';

const ERC20_ABI: Abi = [
	{ type: 'function', name: 'balance_of', inputs: [{ name: 'owner', type: 'core::starknet::contract_address::ContractAddress' }], outputs: [{ type: 'core::integer::u256' }] },
	{ type: 'function', name: 'allowance', inputs: [
		{ name: 'owner', type: 'core::starknet::contract_address::ContractAddress' },
		{ name: 'spender', type: 'core::starknet::contract_address::ContractAddress' },
	], outputs: [{ type: 'core::integer::u256' }] },
	{ type: 'function', name: 'approve', inputs: [
		{ name: 'spender', type: 'core::starknet::contract_address::ContractAddress' },
		{ name: 'amount', type: 'core::integer::u256' },
	], outputs: [{type: 'core::bool'}] },
	{ type: 'function', name: 'transfer', inputs: [
		{ name: 'recipient', type: 'core::starknet::contract_address::ContractAddress' },
		{ name: 'amount', type: 'core::integer::u256' },
	], outputs: [{type: 'core::bool'}] },
	{ type: 'function', name: 'transfer_from', inputs: [
		{ name: 'sender', type: 'core::starknet::contract_address::ContractAddress' },
		{ name: 'recipient', type: 'core::starknet::contract_address::ContractAddress' },
		{ name: 'amount', type: 'core::integer::u256' },
	], outputs: [{type: 'core::bool'}] },
	{ type: 'function', name: 'decimals', inputs: [], outputs: [{ type: 'core::integer::u8' }] },
];

export function getErc20(address: string, providerOrAccount: Provider | Account) {
	return new Contract(ERC20_ABI, address, providerOrAccount);
}