#[starknet::contract]
mod MyToken {
    use openzeppelin_token::erc20::{ERC20Component, ERC20HooksEmptyImpl, DefaultConfig};
    use starknet::ContractAddress;

    component!(path: ERC20Component, storage: erc20, event: ERC20Event);

    // ERC20 Mixin
    #[abi(embed_v0)]
    impl ERC20MixinImpl = ERC20Component::ERC20MixinImpl<ContractState>;
    impl ERC20InternalImpl = ERC20Component::InternalImpl<ContractState>;

    #[storage]
    struct Storage {
        #[substorage(v0)]
        erc20: ERC20Component::Storage
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        #[flat]
        ERC20Event: ERC20Component::Event
    }

    #[constructor]
    fn constructor(
        ref self: ContractState,
        initial_supply: u256,
        recipient: ContractAddress
    ) {
        let name = "MyToken";
        let symbol = "MTK";

        self.erc20.initializer(name, symbol);
        self.erc20.mint(recipient, initial_supply);
    }
}

use snforge_std::{
    declare, ContractClassTrait, DeclareResultTrait, start_cheat_caller_address,
    stop_cheat_caller_address
};

use core::array::ArrayTrait;
use starknet::ContractAddress;
use openzeppelin_token::erc20::interface::{IERC20Dispatcher, IERC20DispatcherTrait};
use openzeppelin_access::ownable::interface::{IOwnableDispatcher, IOwnableDispatcherTrait};

// Import correct interfaces and types from lib.cairo
use menaxa::{
    ICompanyReputationMarketDispatcher, ICompanyReputationMarketDispatcherTrait, 
    PositionSide
};

// Test constants
const OWNER: felt252 = 'owner';
const USER1: felt252 = 'user1';
const USER2: felt252 = 'user2';
const USER3: felt252 = 'user3';
const FEE_RECIPIENT: felt252 = 'fee_recipient';
const INITIAL_SUPPLY: u256 = 1000000000000000; // 1B tokens (6 decimals)
const PLATFORM_FEE_BPS: u256 = 100; // 1%
const MIN_INVESTMENT: u256 = 1000000; // 1 USDC
const MAX_INVESTMENT: u256 = 100000000000; // 100k USDC

// Helper struct to hold deployed contracts
#[derive(Drop)]
struct TestSetup {
    reputation_market: ICompanyReputationMarketDispatcher,
    token: IERC20Dispatcher,
    owner: ContractAddress,
    user1: ContractAddress,
    user2: ContractAddress,
    user3: ContractAddress,
    fee_recipient: ContractAddress,
}

fn deploy_contracts() -> TestSetup {
    let owner: ContractAddress = OWNER.try_into().unwrap();
    let user1: ContractAddress = USER1.try_into().unwrap();
    let user2: ContractAddress = USER2.try_into().unwrap();
    let user3: ContractAddress = USER3.try_into().unwrap();
    let fee_recipient: ContractAddress = FEE_RECIPIENT.try_into().unwrap();

    // Deploy mock token
    let token_class = declare("MyToken").unwrap().contract_class();
    let (token_address, _) = token_class
        .deploy(@array![INITIAL_SUPPLY.low.into(), INITIAL_SUPPLY.high.into(), user1.into()])
        .unwrap();
    let token = IERC20Dispatcher { contract_address: token_address };

    // Deploy CompanyReputationMarket
    let market_class = declare("CompanyReputationMarket").unwrap().contract_class();
    let (market_address, _) = market_class
        .deploy(@array![
            owner.into(),
            token_address.into(),
            fee_recipient.into(),
            PLATFORM_FEE_BPS.low.into(),
            PLATFORM_FEE_BPS.high.into()
        ])
        .unwrap();
    let reputation_market = ICompanyReputationMarketDispatcher { contract_address: market_address };

    TestSetup { reputation_market, token, owner, user1, user2, user3, fee_recipient }
}

fn setup_user_balances(setup: @TestSetup) {
    // Transfer tokens to users for testing - keep 1/3 for user1, give 1/3 each to user2 and user3
    let user_allocation = 333000000000000; // ~333M tokens each
    
    println!("=== INITIAL TOKEN SETUP ===");
    let user1_initial = setup.token.balance_of(*setup.user1);
    println!("User1 initial balance: {}", user1_initial);
    
    start_cheat_caller_address((*setup.token).contract_address, *setup.user1);
    setup.token.transfer(*setup.user2, user_allocation);
    setup.token.transfer(*setup.user3, user_allocation);
    stop_cheat_caller_address((*setup.token).contract_address);

    let user1_after_transfer = setup.token.balance_of(*setup.user1);
    let user2_balance = setup.token.balance_of(*setup.user2);
    let user3_balance = setup.token.balance_of(*setup.user3);
    
    println!("After transfers:");
    println!("User1 balance: {}", user1_after_transfer);
    println!("User2 balance: {}", user2_balance);
    println!("User3 balance: {}", user3_balance);

    // Approve ReputationMarket to spend tokens for all users
    start_cheat_caller_address((*setup.token).contract_address, *setup.user1);
    setup.token.approve((*setup.reputation_market).contract_address, user_allocation + 1000000000000); // Remaining balance + buffer
    stop_cheat_caller_address((*setup.token).contract_address);

    start_cheat_caller_address((*setup.token).contract_address, *setup.user2);
    setup.token.approve((*setup.reputation_market).contract_address, user_allocation);
    stop_cheat_caller_address((*setup.token).contract_address);

    start_cheat_caller_address((*setup.token).contract_address, *setup.user3);
    setup.token.approve((*setup.reputation_market).contract_address, user_allocation);
    stop_cheat_caller_address((*setup.token).contract_address);
    
    println!("=== TOKEN APPROVALS COMPLETE ===");
}

// ================== BASIC FUNCTIONALITY TESTS ==================

#[test]
fn test_deployment() {
    let setup = deploy_contracts();
    
    // Check initial state
    assert(setup.reputation_market.get_active_companies_count() == 0, 'no companies initially');
    assert(setup.reputation_market.get_platform_total_volume() == 0, 'zero initial volume');
    assert(setup.reputation_market.get_platform_tvl() == 0, 'zero initial tvl');
    
    let ownable = IOwnableDispatcher { contract_address: setup.reputation_market.contract_address };
    assert(ownable.owner() == setup.owner, 'owner set correctly');
}

#[test]
fn test_create_company_admin_only() {
    let setup = deploy_contracts();
    setup_user_balances(@setup);

    let company_name = 'Apple Inc';
    let category = 'tech';
    let description = 'Tech giant';

    // Only admin (owner) can create companies
    start_cheat_caller_address(setup.reputation_market.contract_address, setup.owner);
    let company_id = setup.reputation_market.create_company(company_name, category, description);
    stop_cheat_caller_address(setup.reputation_market.contract_address);

    assert(company_id == 1, 'first company id is 1');
    
    // Verify company was created correctly using available getters
    let reputation_score = setup.reputation_market.get_reputation_score(company_id);
    assert(reputation_score == 0, 'initial reputation zero');
    
    let (name, creator, _timestamp, is_active, _volume) = 
        setup.reputation_market.get_company_info(company_id);
    assert(is_active == true, 'company is active');
    assert(name == company_name, 'name matches');
    assert(creator == setup.owner, 'creator is admin');

    let count = setup.reputation_market.get_active_companies_count();
    assert(count == 1, 'active companies count 1');
}

// ================== REPUTATION SYSTEM TESTS ==================

#[test]
fn test_initial_reputation_score() {
    let setup = deploy_contracts();
    setup_user_balances(@setup);

    // Create company
    start_cheat_caller_address(setup.reputation_market.contract_address, setup.owner);
    let company_id = setup.reputation_market.create_company('Tesla', 'auto', 'Electric cars');
    stop_cheat_caller_address(setup.reputation_market.contract_address);

    // Check initial reputation
    let reputation_score = setup.reputation_market.get_reputation_score(company_id);
    assert(reputation_score == 0, 'initial reputation is 0');

    // Check initial share prices (should be 50-50)
    let (pos_price, neg_price) = setup.reputation_market.get_share_prices(company_id);
    assert(pos_price == 500000, 'initial pos price 50%');
    assert(neg_price == 500000, 'initial neg price 50%');
}

#[test]
fn test_reputation_positive_investment() {
    let setup = deploy_contracts();
    setup_user_balances(@setup);

    println!("\n=== TEST: POSITIVE INVESTMENT & REPUTATION CHANGE ===");

    // Create company
    start_cheat_caller_address(setup.reputation_market.contract_address, setup.owner);
    let company_id = setup.reputation_market.create_company('Google', 'tech', 'Search engine');
    stop_cheat_caller_address(setup.reputation_market.contract_address);

    println!("Created company 'Google' with ID: {}", company_id);

    // Check initial state
    let initial_reputation = setup.reputation_market.get_reputation_score(company_id);
    let (initial_pos_price, initial_neg_price) = setup.reputation_market.get_share_prices(company_id);
    let user1_balance_before = setup.token.balance_of(setup.user1);
    
    println!("INITIAL STATE:");
    println!("  Company reputation: {}", initial_reputation);
    println!("  Positive share price: {}", initial_pos_price);
    println!("  Negative share price: {}", initial_neg_price);
    println!("  User1 token balance: {}", user1_balance_before);

    let investment_amount = 10000000; // 10 USDC
    println!("\nINVESTMENT:");
    println!("  Amount: {} tokens", investment_amount);
    println!("  Side: Positive");
    
    // Make positive investment
    start_cheat_caller_address(setup.reputation_market.contract_address, setup.user1);
    setup.reputation_market.invest_in_company(company_id, PositionSide::Positive, investment_amount);
    stop_cheat_caller_address(setup.reputation_market.contract_address);

    // Check state after investment
    let final_reputation = setup.reputation_market.get_reputation_score(company_id);
    let (final_pos_price, final_neg_price) = setup.reputation_market.get_share_prices(company_id);
    let user1_balance_after = setup.token.balance_of(setup.user1);
    let balance_change = user1_balance_before - user1_balance_after;

    println!("\nAFTER INVESTMENT:");
    println!("  Company reputation: {}", final_reputation);
    println!("  Positive share price: {} (previous: {})", final_pos_price, initial_pos_price);
    println!("  Negative share price: {} (previous: {})", final_neg_price, initial_neg_price);
    println!("  User1 token balance: {} (spent: {})", user1_balance_after, balance_change);

    // Check pool state and fees
    let expected_fee = investment_amount * PLATFORM_FEE_BPS / 10000;
    let net_amount = investment_amount - expected_fee;
    let (pos_pool, neg_pool, pos_shares, neg_shares) = setup.reputation_market.debug_pool_state(company_id);
    
    println!("\nPOOL STATE:");
    println!("  Platform fee ({}%): {}", PLATFORM_FEE_BPS / 100, expected_fee);
    println!("  Net investment: {}", net_amount);
    println!("  Positive pool: {}", pos_pool);
    println!("  Negative pool: {}", neg_pool);
    println!("  Positive shares: {}", pos_shares);
    println!("  Negative shares: {}", neg_shares);

    // Get user position details
    let (user_pos_value, user_neg_value) = setup.reputation_market.get_position_value(setup.user1, company_id);
    let (pos_shares_user, _neg_shares_user, pos_invested, _neg_invested, _pos_value_detailed, _neg_value_detailed) = 
        setup.reputation_market.get_detailed_position_value(setup.user1, company_id);
        
    println!("\nUSER1 POSITION:");
    println!("  Positive position value: {}", user_pos_value);
    println!("  Negative position value: {}", user_neg_value);
    println!("  Positive shares owned: {}", pos_shares_user);
    println!("  Amount invested (positive): {}", pos_invested);

    println!("=== END TEST ===\n");

    // Check reputation after positive investment
    assert(final_reputation == 100, 'rep is 100 pos only');

    // Check share prices
    assert(final_pos_price == 1000000, 'positive price 100%');
    assert(final_neg_price == 0, 'negative price 0%');

    // Check pool state
    assert(pos_pool == net_amount, 'positive pool updated');
    assert(neg_pool == 0, 'negative pool unchanged');
    assert(pos_shares == net_amount, 'pos shares eq net invest');
}

#[test]
fn test_reputation_negative_investment() {
    let setup = deploy_contracts();
    setup_user_balances(@setup);

    // Create company
    start_cheat_caller_address(setup.reputation_market.contract_address, setup.owner);
    let company_id = setup.reputation_market.create_company('CompanyX', 'misc', 'Test company');
    stop_cheat_caller_address(setup.reputation_market.contract_address);

    let investment_amount = 5000000; // 5 USDC
    
    // Make negative investment
    start_cheat_caller_address(setup.reputation_market.contract_address, setup.user2);
    setup.reputation_market.invest_in_company(company_id, PositionSide::Negative, investment_amount);
    stop_cheat_caller_address(setup.reputation_market.contract_address);

    // Check reputation after negative investment
    let reputation_score = setup.reputation_market.get_reputation_score(company_id);
    assert(reputation_score == -100, 'rep is -100 neg only');

    // Check share prices
    let (pos_price, neg_price) = setup.reputation_market.get_share_prices(company_id);
    assert(pos_price == 0, 'positive price 0%');
    assert(neg_price == 1000000, 'negative price 100%');

    // Verify user position
    let expected_fee = investment_amount * PLATFORM_FEE_BPS / 10000;
    let net_amount = investment_amount - expected_fee;
    let (_, _, _, neg_shares_user, _, neg_invested) = 
        setup.reputation_market.get_detailed_position_value(setup.user2, company_id);
    assert(neg_shares_user == net_amount, 'user has neg shares');
    assert(neg_invested == net_amount, 'neg invested correct');
}

#[test]
fn test_reputation_balanced_investment() {
    let setup = deploy_contracts();
    setup_user_balances(@setup);

    println!("\n=== TEST: BALANCED INVESTMENT (POSITIVE vs NEGATIVE) ===");

    // Create company
    start_cheat_caller_address(setup.reputation_market.contract_address, setup.owner);
    let company_id = setup.reputation_market.create_company('Microsoft', 'tech', 'Software giant');
    stop_cheat_caller_address(setup.reputation_market.contract_address);

    println!("Created company 'Microsoft' with ID: {}", company_id);

    let investment_amount = 10000000; // 10 USDC each
    let expected_fee = investment_amount * PLATFORM_FEE_BPS / 10000;
    let net_amount = investment_amount - expected_fee;
    
    // Initial state
    let initial_reputation = setup.reputation_market.get_reputation_score(company_id);
    let (initial_pos_price, initial_neg_price) = setup.reputation_market.get_share_prices(company_id);
    let user1_balance_initial = setup.token.balance_of(setup.user1);
    let user2_balance_initial = setup.token.balance_of(setup.user2);
    
    println!("INITIAL STATE:");
    println!("  Company reputation: {}", initial_reputation);
    println!("  Share prices - Positive: {}, Negative: {}", initial_pos_price, initial_neg_price);
    println!("  User1 balance: {}", user1_balance_initial);
    println!("  User2 balance: {}", user2_balance_initial);
    
    // Make positive investment (User1)
    println!("\nSTEP 1: User1 invests POSITIVE {} tokens", investment_amount);
    start_cheat_caller_address(setup.reputation_market.contract_address, setup.user1);
    setup.reputation_market.invest_in_company(company_id, PositionSide::Positive, investment_amount);
    stop_cheat_caller_address(setup.reputation_market.contract_address);

    let after_positive_reputation = setup.reputation_market.get_reputation_score(company_id);
    let (after_pos_pos_price, after_pos_neg_price) = setup.reputation_market.get_share_prices(company_id);
    let user1_balance_after_invest = setup.token.balance_of(setup.user1);
    
    println!("AFTER POSITIVE INVESTMENT:");
    println!("  Company reputation: {} (change: {})", after_positive_reputation, after_positive_reputation - initial_reputation);
    println!("  Share prices - Positive: {}, Negative: {}", after_pos_pos_price, after_pos_neg_price);
    println!("  User1 balance: {} (spent: {})", user1_balance_after_invest, user1_balance_initial - user1_balance_after_invest);

    // Make negative investment (User2)
    println!("\nSTEP 2: User2 invests NEGATIVE {} tokens", investment_amount);
    start_cheat_caller_address(setup.reputation_market.contract_address, setup.user2);
    setup.reputation_market.invest_in_company(company_id, PositionSide::Negative, investment_amount);
    stop_cheat_caller_address(setup.reputation_market.contract_address);

    let final_reputation = setup.reputation_market.get_reputation_score(company_id);
    let (final_pos_price, final_neg_price) = setup.reputation_market.get_share_prices(company_id);
    let user2_balance_after_invest = setup.token.balance_of(setup.user2);
    
    println!("\nFINAL STATE (AFTER BALANCED INVESTMENTS):");
    println!("  Company reputation: {} (total change: {})", final_reputation, final_reputation - initial_reputation);
    println!("  Share prices - Positive: {}, Negative: {}", final_pos_price, final_neg_price);
    println!("  User1 balance: {} (spent: {})", user1_balance_after_invest, user1_balance_initial - user1_balance_after_invest);
    println!("  User2 balance: {} (spent: {})", user2_balance_after_invest, user2_balance_initial - user2_balance_after_invest);

    let (pos_pool, neg_pool, _pos_shares, _neg_shares) = setup.reputation_market.debug_pool_state(company_id);
    
    println!("\nPOOL STATE:");
    println!("  Positive pool: {}", pos_pool);
    println!("  Negative pool: {}", neg_pool);
    println!("  Total liquidity: {}", pos_pool + neg_pool);

    // Show user positions
    let (user1_pos_value, user1_neg_value) = setup.reputation_market.get_position_value(setup.user1, company_id);
    let (user2_pos_value, user2_neg_value) = setup.reputation_market.get_position_value(setup.user2, company_id);
    
    println!("\nUSER POSITIONS:");
    println!("  User1 - Positive: {}, Negative: {}", user1_pos_value, user1_neg_value);
    println!("  User2 - Positive: {}, Negative: {}", user2_pos_value, user2_neg_value);

    println!("=== END BALANCED TEST ===\n");

    assert(pos_pool == net_amount, 'positive pool correct');
    assert(neg_pool == net_amount, 'negative pool correct');

    // Check reputation after balanced investment
    assert(final_reputation == 0, 'rep is 0 balanced');

    // Check share prices (should be 50-50)
    assert(final_pos_price == 500000, 'positive price 50%'); // 0.5 in 6 decimals
    assert(final_neg_price == 500000, 'negative price 50%');
}

// ================== PROFIT/LOSS DEMONSTRATION ==================

#[test] 
fn test_profit_from_positive_sentiment_shift() {
    let setup = deploy_contracts();
    setup_user_balances(@setup);

    println!("\n=== TEST: PROFIT FROM POSITIVE SENTIMENT SHIFT ===");

    // Create company
    start_cheat_caller_address(setup.reputation_market.contract_address, setup.owner);
    let company_id = setup.reputation_market.create_company('StartupInc', 'startup', 'Growing');
    stop_cheat_caller_address(setup.reputation_market.contract_address);

    println!("Created company 'StartupInc' with ID: {}", company_id);

    let initial_investment = 10000000; // 10 USDC
    let user1_balance_start = setup.token.balance_of(setup.user1);
    let user2_balance_start = setup.token.balance_of(setup.user2);
    
    println!("INITIAL BALANCES:");
    println!("  User1: {}", user1_balance_start);
    println!("  User2: {}", user2_balance_start);
    
    // User1 invests positively first
    println!("\nSTEP 1: User1 invests {} tokens POSITIVELY", initial_investment);
    start_cheat_caller_address(setup.reputation_market.contract_address, setup.user1);
    setup.reputation_market.invest_in_company(company_id, PositionSide::Positive, initial_investment);
    stop_cheat_caller_address(setup.reputation_market.contract_address);

    // Check initial position value and market state
    let (initial_pos_value, _initial_neg_value) = setup.reputation_market.get_position_value(setup.user1, company_id);
    let initial_reputation = setup.reputation_market.get_reputation_score(company_id);
    let (initial_pos_price, initial_neg_price) = setup.reputation_market.get_share_prices(company_id);
    let user1_balance_after_first = setup.token.balance_of(setup.user1);
    
    println!("AFTER FIRST INVESTMENT:");
    println!("  User1 position value: {}", initial_pos_value);
    println!("  Company reputation: {}", initial_reputation);
    println!("  Share prices - Positive: {}, Negative: {}", initial_pos_price, initial_neg_price);
    println!("  User1 balance: {} (spent: {})", user1_balance_after_first, user1_balance_start - user1_balance_after_first);
    
    // More users invest positively, increasing positive sentiment
    println!("\nSTEP 2: User2 makes LARGE POSITIVE investment (30M tokens)");
    start_cheat_caller_address(setup.reputation_market.contract_address, setup.user2);
    setup.reputation_market.invest_in_company(company_id, PositionSide::Positive, 30000000); // Large positive investment
    stop_cheat_caller_address(setup.reputation_market.contract_address);

    // Check position value after sentiment shift
    let (final_pos_value, _final_neg_value) = setup.reputation_market.get_position_value(setup.user1, company_id);
    let final_reputation = setup.reputation_market.get_reputation_score(company_id);
    let (final_pos_price, final_neg_price) = setup.reputation_market.get_share_prices(company_id);
    let user2_balance_after = setup.token.balance_of(setup.user2);
    
    println!("AFTER SENTIMENT SHIFT:");
    println!("  User1 position value: {} (change: {})", final_pos_value, final_pos_value - initial_pos_value);
    println!("  Company reputation: {} (change: {})", final_reputation, final_reputation - initial_reputation);
    println!("  Share prices - Positive: {}, Negative: {}", final_pos_price, final_neg_price);
    println!("  User2 balance: {} (spent: {})", user2_balance_after, user2_balance_start - user2_balance_after);

    // Check profit/loss details
    let (pos_amount, pos_is_profit, _neg_amount, _neg_is_profit) = 
        setup.reputation_market.get_user_profit_loss(setup.user1, company_id);
    
    let value_increase = final_pos_value - initial_pos_value;
    let profit_percentage = if initial_pos_value > 0 { (value_increase * 10000) / initial_pos_value } else { 0 };
    
    println!("\nPROFIT/LOSS ANALYSIS:");
    println!("  User1 P&L amount: {}", pos_amount);
    println!("  Is in profit: {}", pos_is_profit);
    println!("  Position value increase: {}", value_increase);
    println!("  Profit percentage (basis points): {}", profit_percentage);
    
    println!("=== END PROFIT TEST ===\n");
    
    // User1's positive position should be worth more now
    assert(final_pos_value >= initial_pos_value, 'position value increased');
    
    // Check profit/loss
    assert(pos_is_profit == true, 'position in profit');
}

#[test]
fn test_loss_from_negative_sentiment_shift() {
    let setup = deploy_contracts();
    setup_user_balances(@setup);

    // Create company
    start_cheat_caller_address(setup.reputation_market.contract_address, setup.owner);
    let company_id = setup.reputation_market.create_company('BadCorp', 'misc', 'Controversial');
    stop_cheat_caller_address(setup.reputation_market.contract_address);

    let initial_investment = 20000000; // 20 USDC
    
    // User1 invests positively
    start_cheat_caller_address(setup.reputation_market.contract_address, setup.user1);
    setup.reputation_market.invest_in_company(company_id, PositionSide::Positive, initial_investment);
    stop_cheat_caller_address(setup.reputation_market.contract_address);

    // Large negative sentiment shift
    start_cheat_caller_address(setup.reputation_market.contract_address, setup.user2);
    setup.reputation_market.invest_in_company(company_id, PositionSide::Negative, 60000000); // 3x negative investment
    stop_cheat_caller_address(setup.reputation_market.contract_address);

    // Check that reputation turned negative
    let reputation_score = setup.reputation_market.get_reputation_score(company_id);
    assert(reputation_score < 0, 'reputation turned negative');
    
    // Check profit/loss for user1's positive position
    let (_pos_amount, pos_is_profit, _neg_amount, _neg_is_profit) = 
        setup.reputation_market.get_user_profit_loss(setup.user1, company_id);
    
    // User1's positive position should now be at a loss
    assert(pos_is_profit == false, 'position at loss');
}

#[test]
fn test_profit_from_negative_bet_winning() {
    let setup = deploy_contracts();
    setup_user_balances(@setup);

    // Create company
    start_cheat_caller_address(setup.reputation_market.contract_address, setup.owner);
    let company_id = setup.reputation_market.create_company('FailingCorp', 'misc', 'In trouble');
    stop_cheat_caller_address(setup.reputation_market.contract_address);

    let investment_amount = 15000000; // 15 USDC
    
    // User2 bets against the company (negative position)
    start_cheat_caller_address(setup.reputation_market.contract_address, setup.user2);
    setup.reputation_market.invest_in_company(company_id, PositionSide::Negative, investment_amount);
    stop_cheat_caller_address(setup.reputation_market.contract_address);

    // More users bet against the company, validating user2's position
    start_cheat_caller_address(setup.reputation_market.contract_address, setup.user3);
    setup.reputation_market.invest_in_company(company_id, PositionSide::Negative, 25000000);
    stop_cheat_caller_address(setup.reputation_market.contract_address);

    // Check that reputation is strongly negative
    let reputation_score = setup.reputation_market.get_reputation_score(company_id);
    assert(reputation_score < -50, 'strongly negative');
    
    // Check profit for user2's negative position
    let (_pos_amount, _pos_is_profit, _neg_amount, neg_is_profit) = 
        setup.reputation_market.get_user_profit_loss(setup.user2, company_id);
    
    assert(neg_is_profit == true, 'neg position profitable');
}

// ================== WITHDRAWAL TESTS ==================

#[test]
fn test_withdrawal_profit_realization() {
    let setup = deploy_contracts();
    setup_user_balances(@setup);

    println!("\n=== TEST: WITHDRAWAL & PROFIT REALIZATION ===");

    // Create company
    start_cheat_caller_address(setup.reputation_market.contract_address, setup.owner);
    let company_id = setup.reputation_market.create_company('ProfitCorp', 'biz', 'Successful');
    stop_cheat_caller_address(setup.reputation_market.contract_address);

    println!("Created company 'ProfitCorp' with ID: {}", company_id);

    let investment_amount = 10000000; // 10 USDC
    let user1_start_balance = setup.token.balance_of(setup.user1);
    
    println!("INITIAL STATE:");
    println!("  User1 balance: {}", user1_start_balance);
    println!("  Investment amount: {}", investment_amount);
    
    // User1 invests positively
    println!("\nSTEP 1: User1 invests {} tokens POSITIVELY", investment_amount);
    start_cheat_caller_address(setup.reputation_market.contract_address, setup.user1);
    setup.reputation_market.invest_in_company(company_id, PositionSide::Positive, investment_amount);
    stop_cheat_caller_address(setup.reputation_market.contract_address);

    let after_investment_balance = setup.token.balance_of(setup.user1);
    let (pos_value_before_shift, _) = setup.reputation_market.get_position_value(setup.user1, company_id);
    let reputation_before = setup.reputation_market.get_reputation_score(company_id);
    
    println!("AFTER INVESTMENT:");
    println!("  User1 balance: {} (spent: {})", after_investment_balance, user1_start_balance - after_investment_balance);
    println!("  Position value: {}", pos_value_before_shift);
    println!("  Company reputation: {}", reputation_before);

    let initial_balance = setup.token.balance_of(setup.user1);

    // Create positive sentiment
    println!("\nSTEP 2: User2 creates positive sentiment (30M tokens investment)");
    start_cheat_caller_address(setup.reputation_market.contract_address, setup.user2);
    setup.reputation_market.invest_in_company(company_id, PositionSide::Positive, 30000000);
    stop_cheat_caller_address(setup.reputation_market.contract_address);

    let (pos_value_after_shift, _) = setup.reputation_market.get_position_value(setup.user1, company_id);
    let reputation_after = setup.reputation_market.get_reputation_score(company_id);
    let (pos_price, neg_price) = setup.reputation_market.get_share_prices(company_id);
    
    println!("AFTER SENTIMENT SHIFT:");
    println!("  User1 position value: {} (increase: {})", pos_value_after_shift, pos_value_after_shift - pos_value_before_shift);
    println!("  Company reputation: {} (change: {})", reputation_after, reputation_after - reputation_before);
    println!("  Share prices - Positive: {}, Negative: {}", pos_price, neg_price);

    // Show P&L before withdrawal
    let (pnl_amount_before, is_profit_before, _, _) = 
        setup.reputation_market.get_user_profit_loss(setup.user1, company_id);
    
    println!("\nP&L BEFORE WITHDRAWAL:");
    println!("  P&L amount: {}", pnl_amount_before);
    println!("  Is profit: {}", is_profit_before);

    // Withdraw 100% of position to realize profit
    println!("\nSTEP 3: User1 withdraws 100% of position to realize profit");
    start_cheat_caller_address(setup.reputation_market.contract_address, setup.user1);
    setup.reputation_market.withdraw_position(company_id, PositionSide::Positive, 10000); // 100%
    stop_cheat_caller_address(setup.reputation_market.contract_address);

    let final_balance = setup.token.balance_of(setup.user1);
    let net_gain = final_balance - initial_balance;
    
    println!("AFTER WITHDRAWAL:");
    println!("  User1 final balance: {}", final_balance);
    println!("  Net gain from withdrawal: {}", net_gain);
    println!("  Balance before investment: {}", user1_start_balance);
    println!("  Original investment: {}", investment_amount);
    
    let (pos_shares_user, _, pos_invested, _, _, _) = 
        setup.reputation_market.get_detailed_position_value(setup.user1, company_id);
    
    println!("\nPOSITION AFTER WITHDRAWAL:");
    println!("  Remaining shares: {}", pos_shares_user);
    println!("  Remaining invested: {}", pos_invested);
    
    println!("=== END WITHDRAWAL TEST ===\n");
    
    // Should have gained more than the original investment (minus fees)
    assert(net_gain > 0, 'realized profit');
    
    assert(pos_shares_user == 0, 'position fully closed');
    assert(pos_invested == 0, 'invested reset to zero');
}

// ================== EDGE CASE TESTS ==================

#[test]
#[should_panic(expected: ('Investment below minimum',))]
fn test_investment_below_minimum() {
    let setup = deploy_contracts();
    setup_user_balances(@setup);

    // Create company
    start_cheat_caller_address(setup.reputation_market.contract_address, setup.owner);
    let company_id = setup.reputation_market.create_company('TestCorp', 'test', 'Test company');
    stop_cheat_caller_address(setup.reputation_market.contract_address);

    let below_min_amount = MIN_INVESTMENT - 1; // Below minimum
    
    // Try to invest below minimum - should fail
    start_cheat_caller_address(setup.reputation_market.contract_address, setup.user1);
    setup.reputation_market.invest_in_company(company_id, PositionSide::Positive, below_min_amount);
    stop_cheat_caller_address(setup.reputation_market.contract_address);
}

#[test]
#[should_panic(expected: ('Investment above maximum',))]
fn test_investment_above_maximum() {
    let setup = deploy_contracts();
    setup_user_balances(@setup);

    // Create company
    start_cheat_caller_address(setup.reputation_market.contract_address, setup.owner);
    let company_id = setup.reputation_market.create_company('TestCorp', 'test', 'Test company');
    stop_cheat_caller_address(setup.reputation_market.contract_address);

    let above_max_amount = MAX_INVESTMENT + 1; // Above maximum
    
    // Try to invest above maximum - should fail
    start_cheat_caller_address(setup.reputation_market.contract_address, setup.user1);
    setup.reputation_market.invest_in_company(company_id, PositionSide::Positive, above_max_amount);
    stop_cheat_caller_address(setup.reputation_market.contract_address);
}

#[test]
#[should_panic(expected: ('Caller is not the owner',))]
fn test_unauthorized_company_creation() {
    let setup = deploy_contracts();
    setup_user_balances(@setup);

    // Try to create company as non-admin - should fail
    start_cheat_caller_address(setup.reputation_market.contract_address, setup.user1);
    setup.reputation_market.create_company('UnauthorizedCorp', 'test', 'Should fail');
    stop_cheat_caller_address(setup.reputation_market.contract_address);
}

#[test]
#[should_panic(expected: ('Invalid company ID',))]
fn test_invest_nonexistent_company() {
    let setup = deploy_contracts();
    setup_user_balances(@setup);

    let nonexistent_company_id = 999;
    let investment_amount = 10000000;
    
    // Try to invest in non-existent company - should fail
    start_cheat_caller_address(setup.reputation_market.contract_address, setup.user1);
    setup.reputation_market.invest_in_company(nonexistent_company_id, PositionSide::Positive, investment_amount);
    stop_cheat_caller_address(setup.reputation_market.contract_address);
}

#[test]
#[should_panic(expected: ('No position to close',))]
fn test_withdraw_with_no_position() {
    let setup = deploy_contracts();
    setup_user_balances(@setup);

    // Create company
    start_cheat_caller_address(setup.reputation_market.contract_address, setup.owner);
    let company_id = setup.reputation_market.create_company('TestCorp', 'test', 'Test company');
    stop_cheat_caller_address(setup.reputation_market.contract_address);

    // Try to withdraw without having a position - should fail
    start_cheat_caller_address(setup.reputation_market.contract_address, setup.user1);
    setup.reputation_market.withdraw_position(company_id, PositionSide::Positive, 5000);
    stop_cheat_caller_address(setup.reputation_market.contract_address);
}

#[test]
#[should_panic(expected: ('Invalid percentage',))]
fn test_withdraw_invalid_percentage() {
    let setup = deploy_contracts();
    setup_user_balances(@setup);

    // Create company and invest
    start_cheat_caller_address(setup.reputation_market.contract_address, setup.owner);
    let company_id = setup.reputation_market.create_company('TestCorp', 'test', 'Test company');
    stop_cheat_caller_address(setup.reputation_market.contract_address);

    start_cheat_caller_address(setup.reputation_market.contract_address, setup.user1);
    setup.reputation_market.invest_in_company(company_id, PositionSide::Positive, 10000000);
    
    // Try to withdraw more than 100% - should fail
    setup.reputation_market.withdraw_position(company_id, PositionSide::Positive, 10001);
    stop_cheat_caller_address(setup.reputation_market.contract_address);
}

#[test]
fn test_zero_reputation_with_no_investments() {
    let setup = deploy_contracts();
    setup_user_balances(@setup);

    // Create company but make no investments
    start_cheat_caller_address(setup.reputation_market.contract_address, setup.owner);
    let company_id = setup.reputation_market.create_company('EmptyCorp', 'test', 'No investments');
    stop_cheat_caller_address(setup.reputation_market.contract_address);

    // Check reputation remains zero
    let reputation_score = setup.reputation_market.get_reputation_score(company_id);
    assert(reputation_score == 0, 'empty company rep zero');

    // Check share prices remain 50-50
    let (pos_price, neg_price) = setup.reputation_market.get_share_prices(company_id);
    assert(pos_price == 500000, 'empty pos price 50%');
    assert(neg_price == 500000, 'empty neg price 50%');

    // Check position values are zero
    let (pos_value, neg_value) = setup.reputation_market.get_position_value(setup.user1, company_id);
    assert(pos_value == 0, 'no pos value');
    assert(neg_value == 0, 'no neg value');
}

#[test]
fn test_minimum_valid_investment() {
    let setup = deploy_contracts();
    setup_user_balances(@setup);

    // Create company
    start_cheat_caller_address(setup.reputation_market.contract_address, setup.owner);
    let company_id = setup.reputation_market.create_company('MinCorp', 'test', 'Min investment test');
    stop_cheat_caller_address(setup.reputation_market.contract_address);

    // Make minimum valid investment
    start_cheat_caller_address(setup.reputation_market.contract_address, setup.user1);
    setup.reputation_market.invest_in_company(company_id, PositionSide::Positive, MIN_INVESTMENT);
    stop_cheat_caller_address(setup.reputation_market.contract_address);

    // Should succeed and update reputation
    let reputation_score = setup.reputation_market.get_reputation_score(company_id);
    assert(reputation_score == 100, 'min invest rep 100');
}

#[test]
fn test_multiple_small_investments() {
    let setup = deploy_contracts();
    setup_user_balances(@setup);

    // Create company
    start_cheat_caller_address(setup.reputation_market.contract_address, setup.owner);
    let company_id = setup.reputation_market.create_company('MultiCorp', 'test', 'Multiple investments');
    stop_cheat_caller_address(setup.reputation_market.contract_address);

    let small_amount = MIN_INVESTMENT;
    
    // Make multiple small investments from same user
    start_cheat_caller_address(setup.reputation_market.contract_address, setup.user1);
    setup.reputation_market.invest_in_company(company_id, PositionSide::Positive, small_amount);
    setup.reputation_market.invest_in_company(company_id, PositionSide::Positive, small_amount);
    setup.reputation_market.invest_in_company(company_id, PositionSide::Positive, small_amount);
    stop_cheat_caller_address(setup.reputation_market.contract_address);

    // Check accumulated position
    let (pos_value, _) = setup.reputation_market.get_position_value(setup.user1, company_id);
    let expected_fee_per_invest = small_amount * PLATFORM_FEE_BPS / 10000;
    let expected_net_per_invest = small_amount - expected_fee_per_invest;
    let expected_total_value = expected_net_per_invest * 3; // 3 investments
    assert(pos_value >= expected_total_value, 'accumulated position');
}

#[test]
fn test_partial_withdrawal_edge_case() {
    let setup = deploy_contracts();
    setup_user_balances(@setup);

    // Create company and invest
    start_cheat_caller_address(setup.reputation_market.contract_address, setup.owner);
    let company_id = setup.reputation_market.create_company('PartialCorp', 'test', 'Partial withdraw');
    stop_cheat_caller_address(setup.reputation_market.contract_address);

    start_cheat_caller_address(setup.reputation_market.contract_address, setup.user1);
    setup.reputation_market.invest_in_company(company_id, PositionSide::Positive, 20000000);

    // Withdraw very small percentage (0.01%)
    setup.reputation_market.withdraw_position(company_id, PositionSide::Positive, 1);
    
    // Check position still exists but reduced
    let (pos_shares_after, _, pos_invested_after, _, _, _) = 
        setup.reputation_market.get_detailed_position_value(setup.user1, company_id);
    assert(pos_shares_after > 0, 'position still exists');
    assert(pos_invested_after > 0, 'invested still positive');
    stop_cheat_caller_address(setup.reputation_market.contract_address);
}

#[test]
fn test_fee_calculation_precision() {
    let setup = deploy_contracts();
    setup_user_balances(@setup);

    // Create company
    start_cheat_caller_address(setup.reputation_market.contract_address, setup.owner);
    let company_id = setup.reputation_market.create_company('FeeCorp', 'test', 'Fee calculation test');
    stop_cheat_caller_address(setup.reputation_market.contract_address);

    let investment_amount = 10000001; // Odd amount to test precision
    
    start_cheat_caller_address(setup.reputation_market.contract_address, setup.user1);
    setup.reputation_market.invest_in_company(company_id, PositionSide::Positive, investment_amount);
    stop_cheat_caller_address(setup.reputation_market.contract_address);

    // Calculate expected fee and net amount
    let expected_fee = investment_amount * PLATFORM_FEE_BPS / 10000;
    let expected_net = investment_amount - expected_fee;
    
    let (pos_pool, _, _, _) = setup.reputation_market.debug_pool_state(company_id);
    assert(pos_pool == expected_net, 'precise fee calculation');
}

#[test]
fn test_extreme_reputation_values() {
    let setup = deploy_contracts();
    setup_user_balances(@setup);

    // Create company
    start_cheat_caller_address(setup.reputation_market.contract_address, setup.owner);
    let company_id = setup.reputation_market.create_company('ExtremeCorp', 'test', 'Extreme reputation');
    stop_cheat_caller_address(setup.reputation_market.contract_address);

    // Create extreme positive sentiment with large investment
    start_cheat_caller_address(setup.reputation_market.contract_address, setup.user1);
    setup.reputation_market.invest_in_company(company_id, PositionSide::Positive, 50000000000); // 50k USDC
    stop_cheat_caller_address(setup.reputation_market.contract_address);

    // Check reputation is at maximum (100)
    let reputation_score = setup.reputation_market.get_reputation_score(company_id);
    assert(reputation_score == 100, 'max reputation 100');
    
    // Check share prices
    let (pos_price, neg_price) = setup.reputation_market.get_share_prices(company_id);
    assert(pos_price == 1000000, 'pos price 100%');
    assert(neg_price == 0, 'neg price 0%');

    // Now create extreme negative sentiment
    start_cheat_caller_address(setup.reputation_market.contract_address, setup.user2);
    setup.reputation_market.invest_in_company(company_id, PositionSide::Negative, 100000000000); // 100k USDC (2x positive)
    stop_cheat_caller_address(setup.reputation_market.contract_address);

    // Check reputation turned negative
    let new_reputation_score = setup.reputation_market.get_reputation_score(company_id);
    assert(new_reputation_score < 0, 'reputation turned negative');
}

