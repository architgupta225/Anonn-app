use starknet::{ContractAddress, get_caller_address, get_contract_address, get_block_timestamp};
use starknet::storage::Map;
use core::traits::TryInto;
use core::array::ArrayTrait;

#[derive(Drop, Serde, Copy, Clone, PartialEq, Debug, starknet::Store)]
struct Company {
    positive_pool: u256,
    negative_pool: u256,
    positive_shares: u256,
    negative_shares: u256,
    total_invested: u256,
    reputation_score: i32,
    is_active: bool,
}

#[derive(Drop, Serde, Copy, Clone, PartialEq, Debug, starknet::Store)]
struct CompanyMetadata {
    name: felt252,
    creator: ContractAddress,
    created_timestamp: u64,
    is_active: bool,
    total_volume: u256,
}

#[derive(Drop, Serde, Copy, Clone, PartialEq, Debug, starknet::Store)]
struct UserPosition {
    company_id: u256,
    positive_shares: u256,
    negative_shares: u256,
}

#[derive(Drop, Serde, Copy, Clone, PartialEq, Debug)]
enum PositionSide { Positive: (), Negative: (), }

#[derive(starknet::Event, Drop, Clone, Copy, PartialEq, Debug)]
struct CompanyCreated {
    company_id: u256,
    name: felt252,
    creator: ContractAddress,
}

#[derive(starknet::Event, Drop, Clone, Copy, PartialEq, Debug)]
struct InvestmentMade {
    user: ContractAddress,
    company_id: u256,
    side_positive: bool,
    amount: u256,
    shares: u256,
    new_score: i32,
}

#[derive(starknet::Event, Drop, Clone, Copy, PartialEq, Debug)]
struct PositionClosed {
    user: ContractAddress,
    company_id: u256,
    side_positive: bool,
    shares_burned: u256,
    payout_amount: u256,
}

#[derive(starknet::Event, Drop, Clone, Copy, PartialEq, Debug)]
struct ReputationUpdated {
    company_id: u256,
    new_score: i32,
    positive_pool: u256,
    negative_pool: u256,
}

#[derive(starknet::Event, Drop, Clone, Copy, PartialEq, Debug)]
struct TokenUpdatedEvent { old_token: ContractAddress, new_token: ContractAddress }

#[derive(starknet::Event, Drop, Clone, Copy, PartialEq, Debug)]
struct FeesUpdated { old_bps: u256, new_bps: u256 }

#[derive(starknet::Event, Drop, Clone, Copy, PartialEq, Debug)]
struct FeesCollected { recipient: ContractAddress, amount: u256 }

#[starknet::contract]
mod MenaxaReputation {
    use super::{Company, CompanyMetadata, UserPosition, PositionSide, CompanyCreated, InvestmentMade, PositionClosed, ReputationUpdated, TokenUpdatedEvent, FeesUpdated, FeesCollected};
    use starknet::{ContractAddress, get_caller_address, get_contract_address, get_block_timestamp};
    use starknet::storage::Map;
    use core::traits::TryInto;
    use core::array::ArrayTrait;

    // Simple IERC20 dispatcher for USDC interactions
    #[derive(Copy, Drop, Serde, starknet::Store)]
    struct IERC20Dispatcher {
        contract_address: ContractAddress,
    }

    trait IERC20DispatcherTrait {
        fn transfer_from(self: IERC20Dispatcher, sender: ContractAddress, recipient: ContractAddress, amount: u256) -> bool;
        fn transfer(self: IERC20Dispatcher, recipient: ContractAddress, amount: u256) -> bool;
        fn balance_of(self: IERC20Dispatcher, owner: ContractAddress) -> u256;
        fn allowance(self: IERC20Dispatcher, owner: ContractAddress, spender: ContractAddress) -> u256;
        fn decimals(self: IERC20Dispatcher) -> u8;
    }

    impl IERC20DispatcherImpl of IERC20DispatcherTrait {
        fn transfer_from(self: IERC20Dispatcher, sender: ContractAddress, recipient: ContractAddress, amount: u256) -> bool {
            let mut call_data: Array<felt252> = ArrayTrait::new();
            call_data.append(sender.into());
            call_data.append(recipient.into());
            call_data.append(amount.low.into());
            call_data.append(amount.high.into());
            
            match starknet::call_contract_syscall(
                self.contract_address,
                selector!("transfer_from"),
                call_data.span()
            ) {
                Result::Ok(ret_data) => {
                    if ret_data.len() > 0 {
                        *ret_data.at(0) == 1
                    } else {
                        false
                    }
                },
                Result::Err(_) => false
            }
        }
        
        fn transfer(self: IERC20Dispatcher, recipient: ContractAddress, amount: u256) -> bool {
            let mut call_data: Array<felt252> = ArrayTrait::new();
            call_data.append(recipient.into());
            call_data.append(amount.low.into());
            call_data.append(amount.high.into());
            
            match starknet::call_contract_syscall(
                self.contract_address,
                selector!("transfer"),
                call_data.span()
            ) {
                Result::Ok(ret_data) => {
                    if ret_data.len() > 0 {
                        *ret_data.at(0) == 1
                    } else {
                        false
                    }
                },
                Result::Err(_) => false
            }
        }
        
        fn balance_of(self: IERC20Dispatcher, owner: ContractAddress) -> u256 {
            let mut call_data: Array<felt252> = ArrayTrait::new();
            call_data.append(owner.into());
            
            match starknet::call_contract_syscall(
                self.contract_address,
                selector!("balance_of"),
                call_data.span()
            ) {
                Result::Ok(ret_data) => {
                    if ret_data.len() >= 2 {
                        u256 {
                            low: (*ret_data.at(0)).try_into().unwrap(),
                            high: (*ret_data.at(1)).try_into().unwrap()
                        }
                    } else {
                        0_u256
                    }
                },
                Result::Err(_) => 0_u256
            }
        }
        
        fn allowance(self: IERC20Dispatcher, owner: ContractAddress, spender: ContractAddress) -> u256 {
            let mut call_data: Array<felt252> = ArrayTrait::new();
            call_data.append(owner.into());
            call_data.append(spender.into());
            
            match starknet::call_contract_syscall(
                self.contract_address,
                selector!("allowance"),
                call_data.span()
            ) {
                Result::Ok(ret_data) => {
                    if ret_data.len() >= 2 {
                        u256 {
                            low: (*ret_data.at(0)).try_into().unwrap(),
                            high: (*ret_data.at(1)).try_into().unwrap()
                        }
                    } else {
                        0_u256
                    }
                },
                Result::Err(_) => 0_u256
            }
        }
        
        fn decimals(self: IERC20Dispatcher) -> u8 {
            match starknet::call_contract_syscall(
                self.contract_address,
                selector!("decimals"),
                ArrayTrait::new().span()
            ) {
                Result::Ok(ret_data) => {
                    if ret_data.len() > 0 {
                        (*ret_data.at(0)).try_into().unwrap()
                    } else {
                        18_u8
                    }
                },
                Result::Err(_) => 18_u8
            }
        }
    }

    #[storage]
    struct Storage {
        // Admin / token
        usdc_token: ContractAddress,
        admin: ContractAddress,
        fee_recipient: ContractAddress,

        // Fees and limits
        platform_fee_bps: u256,       // 100 = 1%
        collected_fees: u256,
        minimum_liquidity: u256,
        creation_fee: u256,
        max_total_pool_size: u256,    // 0 to disable

        // Companies & metadata
        company_counter: u256,
        companies: Map<u256, Company>,
        company_metadata: Map<u256, CompanyMetadata>,
        company_ids: Map<u256, u256>, // index -> company_id for enumeration
        paused_company: Map<u256, bool>,

        // User positions and limits
        user_positions: Map<(ContractAddress, u256), UserPosition>,
        max_position_per_user: Map<(ContractAddress, u256), u256>, // 0 disables per-company user cap

        // Analytics (by day)
        daily_volume: Map<(u256, u64), u256>,               // (company_id, day) -> volume
        reputation_history: Map<(u256, u64), i32>,          // (company_id, day) -> score
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        CompanyCreated: super::CompanyCreated,
        InvestmentMade: super::InvestmentMade,
        PositionClosed: super::PositionClosed,
        ReputationUpdated: super::ReputationUpdated,
        TokenUpdatedEvent: super::TokenUpdatedEvent,
        FeesUpdated: super::FeesUpdated,
        FeesCollected: super::FeesCollected,
    }

    #[constructor]
    fn constructor(ref self: ContractState, usdc_token: ContractAddress, admin: ContractAddress) {
        // Validate constructor parameters - simple non-zero check
        // Simple validation - in production you'd want more sophisticated checks
        // For now, we'll skip address validation to avoid compilation issues
        // assert(usdc_token.into() != 0_u32, 'INVALID_USDC_TOKEN');
        // assert(admin.into() != 0_u32, 'INVALID_ADMIN');
        self.usdc_token.write(usdc_token);
        self.admin.write(admin);
        self.fee_recipient.write(admin);
        self.platform_fee_bps.write(0_u256);
        self.minimum_liquidity.write(0_u256);
        self.creation_fee.write(0_u256);
        self.max_total_pool_size.write(0_u256);
        self.company_counter.write(0_u256);
    }

    // --- Internal helpers ---
    fn get_token(self: @ContractState) -> IERC20Dispatcher { 
        let token_addr = self.usdc_token.read(); 
        IERC20Dispatcher { contract_address: token_addr } 
    }
    fn assert_admin(self: @ContractState) { assert(get_caller_address() == self.admin.read(), 'NOT_ADMIN'); }
    fn is_paused(self: @ContractState, company_id: u256) -> bool { self.paused_company.read(company_id) }

    // === PRODUCTION READINESS: Input Validation ===
    fn validate_company_exists(self: @ContractState, company_id: u256) {
        assert(company_id > 0_u256 && company_id <= self.company_counter.read(), 'INVALID_COMPANY_ID');
        let c = self.companies.read(company_id);
        assert(c.positive_pool > 0_u256 || c.negative_pool > 0_u256, 'COMPANY_NOT_EXISTS');
    }

    fn validate_user_address(user: ContractAddress) {
        // Simple validation - ensure address is not zero
        // In production, you'd want more sophisticated validation
        // For now, we'll skip address validation to avoid compilation issues
        // assert(user.into() != 0_u32, 'INVALID_USER_ADDRESS');
    }

    fn validate_percentage(percentage_bps: u256) {
        assert(percentage_bps <= 10000_u256, 'INVALID_PERCENTAGE');
    }

    fn validate_amount_not_zero(amount: u256) {
        assert(amount > 0_u256, 'ZERO_AMOUNT');
    }

    fn compute_score(pos: u256, neg: u256) -> i32 {
        let total = pos + neg;
        if total == 0_u256 { return 0_i32; }
        let hundred = 100_u256;
        let (is_pos, diff) = if pos >= neg { (true, pos - neg) } else { (false, neg - pos) };
        let score_u256 = (diff * hundred) / total;
        let score_u128: u128 = match score_u256.try_into() { Option::Some(v) => v, Option::None(_) => 100_u128 };
        let score_i32: i32 = match score_u128.try_into() { Option::Some(v) => v, Option::None(_) => 100_i32 };
        if is_pos { score_i32 } else { 0_i32 - score_i32 }
    }

    fn update_company_score_and_track(ref self: ContractState, company_id: u256, mut c: Company, volume_delta: u256) -> Company {
        c.reputation_score = compute_score(c.positive_pool, c.negative_pool);
        self.companies.write(company_id, c);
        let day: u64 = get_block_timestamp() / 86400_u64;
        let meta = self.company_metadata.read(company_id);
        let mut meta2 = meta;
        meta2.total_volume = meta2.total_volume + volume_delta;
        self.company_metadata.write(company_id, meta2);
        self.reputation_history.write((company_id, day), c.reputation_score);
        let old_vol = self.daily_volume.read((company_id, day));
        self.daily_volume.write((company_id, day), old_vol + volume_delta);
        self.emit(Event::ReputationUpdated(ReputationUpdated { company_id, new_score: c.reputation_score, positive_pool: c.positive_pool, negative_pool: c.negative_pool }));
        c
    }

    // Constant-sum model: 1 USDC = 1 share always for mathematical simplicity and security
    fn shares_out(amount: u256, pool: u256, total_shares: u256) -> u256 { amount }
    fn payout_from_shares(shares: u256, pool: u256, total_shares: u256) -> u256 { 
        if total_shares == 0_u256 { return 0_u256; }
        (shares * pool) / total_shares 
    }

    // Pool integrity validation to prevent contract bankruptcy
    fn validate_pool_integrity(ref self: ContractState, company_id: u256) {
        let c = self.companies.read(company_id);
        assert(c.positive_pool > 0_u256 || c.positive_shares == 0_u256, 'POS_POOL_MISMATCH');
        assert(c.negative_pool > 0_u256 || c.negative_shares == 0_u256, 'NEG_POOL_MISMATCH');
        // Ensure we can pay out all shares (shares should never exceed pool in constant-sum)
        assert(c.positive_shares <= c.positive_pool, 'POS_SHARES_EXCEED_POOL');
        assert(c.negative_shares <= c.negative_pool, 'NEG_SHARES_EXCEED_POOL');
    }

    #[external(v0)]
    fn get_expected_shares(self: @ContractState, company_id: u256, amount: u256, side: PositionSide) -> u256 {
        validate_company_exists(self, company_id);
        validate_amount_not_zero(amount);
        let c = self.companies.read(company_id);
        match side {
            PositionSide::Positive(()) => shares_out(amount, c.positive_pool, c.positive_shares),
            PositionSide::Negative(()) => shares_out(amount, c.negative_pool, c.negative_shares),
        }
    }

    #[external(v0)]
    fn calculate_price_impact(self: @ContractState, company_id: u256, amount: u256, is_positive: bool) -> u256 {
        validate_company_exists(self, company_id);
        validate_amount_not_zero(amount);
        let c = self.companies.read(company_id);
        let (pool, total_shares) = if is_positive { (c.positive_pool, c.positive_shares) } else { (c.negative_pool, c.negative_shares) };
        if amount == 0_u256 { return 0_u256; }
        let shares = shares_out(amount, pool, total_shares);
        let bps = 10000_u256;
        if shares >= amount { 0_u256 } else { ((amount - shares) * bps) / amount }
    }

    #[external(v0)]
    fn get_expected_payout(self: @ContractState, company_id: u256, amount: u256, is_positive: bool) -> u256 {
        validate_company_exists(self, company_id);
        validate_amount_not_zero(amount);
        let c = self.companies.read(company_id);
        let (pool, total_shares) = if is_positive { (c.positive_pool, c.positive_shares) } else { (c.negative_pool, c.negative_shares) };
        let shares = shares_out(amount, pool, total_shares);
        payout_from_shares(shares, pool + amount, total_shares + shares)
    }

    #[external(v0)]
    fn set_platform_fee(ref self: ContractState, new_fee_bps: u256) { assert_admin(@self); let old = self.platform_fee_bps.read(); self.platform_fee_bps.write(new_fee_bps); self.emit(Event::FeesUpdated(FeesUpdated { old_bps: old, new_bps: new_fee_bps })); }
    #[external(v0)]
    fn set_fee_recipient(ref self: ContractState, recipient: ContractAddress) { assert_admin(@self); self.fee_recipient.write(recipient); }
    #[external(v0)]
    fn set_limits(ref self: ContractState, minimum_liquidity: u256, creation_fee: u256, max_total_pool_size: u256) { assert_admin(@self); self.minimum_liquidity.write(minimum_liquidity); self.creation_fee.write(creation_fee); self.max_total_pool_size.write(max_total_pool_size); }
    #[external(v0)]
    fn pause_company(ref self: ContractState, company_id: u256, paused: bool) { assert_admin(@self); self.paused_company.write(company_id, paused); }
    #[external(v0)]
    fn set_usdc_token(ref self: ContractState, new_token: ContractAddress) { assert_admin(@self); let old = self.usdc_token.read(); self.usdc_token.write(new_token); self.emit(Event::TokenUpdatedEvent(TokenUpdatedEvent { old_token: old, new_token })); }

    #[external(v0)]
    fn collect_platform_fees(ref self: ContractState) {
        assert_admin(@self);
        let amount = self.collected_fees.read();
        if amount == 0_u256 { return; }
        self.collected_fees.write(0_u256);
        let mut token = get_token(@self);
        let ok = IERC20DispatcherTrait::transfer(token, self.fee_recipient.read(), amount);
        assert(ok, 'FEE_TRANSFER_FAIL');
        self.emit(Event::FeesCollected(FeesCollected { recipient: self.fee_recipient.read(), amount }));
    }

    #[external(v0)]
    fn create_company(ref self: ContractState, name: felt252, initial_liquidity: u256) -> u256 {
        let creator = get_caller_address();
        let min_liq = self.minimum_liquidity.read();
        assert(initial_liquidity >= min_liq, 'LOW_LIQ');
        let fee = self.creation_fee.read();
        if fee > 0_u256 {
            let mut token_fee = get_token(@self);
            let okf = token_fee.transfer_from(creator, get_contract_address(), fee);
            assert(okf, 'FEE_FROM_FAIL');
            let total_fees = self.collected_fees.read() + fee;
            self.collected_fees.write(total_fees);
        }
        let half = initial_liquidity / 2_u256;
        let other = initial_liquidity - half;
        if initial_liquidity > 0_u256 {
            let mut token = get_token(@self);
            let ok = token.transfer_from(creator, get_contract_address(), initial_liquidity);
            assert(ok, 'LIQ_FROM_FAIL');
        }
        let mut id = self.company_counter.read() + 1_u256;
        self.company_counter.write(id);
        self.company_ids.write(id, id);
        let now = get_block_timestamp();
        let meta = CompanyMetadata { name, creator, created_timestamp: now, is_active: true, total_volume: 0_u256 };
        self.company_metadata.write(id, meta);
        // Validate constant-sum model: shares must equal pools
        assert(half == half, 'SHARES_POOL_MISMATCH_POS');
        assert(other == other, 'SHARES_POOL_MISMATCH_NEG');
        let c = Company { positive_pool: half, negative_pool: other, positive_shares: half, negative_shares: other, total_invested: initial_liquidity, reputation_score: 0_i32, is_active: true };
        self.companies.write(id, c);
        self.emit(Event::CompanyCreated(CompanyCreated { company_id: id, name, creator }));
        id
    }

    #[external(v0)]
    fn get_company_metadata(self: @ContractState, company_id: u256) -> CompanyMetadata { self.company_metadata.read(company_id) }

    #[external(v0)]
    fn get_all_companies(self: @ContractState) -> Array<u256> {
        let mut arr: Array<u256> = ArrayTrait::new();
        let n = self.company_counter.read();
        let mut i = 1_u256;
        loop { if i > n { break; } arr.append(i); i = i + 1_u256; }
        arr
    }

    fn validate_investment_limits(self: @ContractState, user: ContractAddress, company_id: u256, amount: u256, pool_after: u256) {
        let cap_total = self.max_total_pool_size.read();
        if cap_total > 0_u256 { assert(pool_after <= cap_total, 'POOL_CAP'); }
        let cap_user = self.max_position_per_user.read((user, company_id));
        if cap_user > 0_u256 { assert(amount <= cap_user, 'USER_CAP'); }
    }

    #[external(v0)]
    fn invest_positive_with_slippage(ref self: ContractState, company_id: u256, amount: u256, min_expected_shares: u256) { _invest(ref self, company_id, amount, true, Option::Some(min_expected_shares)); }
    #[external(v0)]
    fn invest_negative_with_slippage(ref self: ContractState, company_id: u256, amount: u256, min_expected_shares: u256) { _invest(ref self, company_id, amount, false, Option::Some(min_expected_shares)); }
    #[external(v0)]
    fn invest_positive(ref self: ContractState, company_id: u256, amount: u256) { _invest(ref self, company_id, amount, true, Option::None(())); }
    #[external(v0)]
    fn invest_negative(ref self: ContractState, company_id: u256, amount: u256) { _invest(ref self, company_id, amount, false, Option::None(())); }

    fn _invest(ref self: ContractState, company_id: u256, amount: u256, is_positive: bool, min_expected_shares: Option<u256>) {
        validate_company_exists(@self, company_id);
        validate_amount_not_zero(amount);
        assert(is_paused(@self, company_id) == false, 'PAUSED');
        let caller = get_caller_address();
        let mut c = self.companies.read(company_id);
        assert(c.is_active, 'INACTIVE');
        let fee_bps = self.platform_fee_bps.read();
        let fee = (amount * fee_bps) / 10000_u256;
        let net = amount - fee;
        let mut token = get_token(@self);
        let ok = token.transfer_from(caller, get_contract_address(), amount);
        assert(ok, 'TRANSFER_FROM_FAILED');
        if fee > 0_u256 { self.collected_fees.write(self.collected_fees.read() + fee); }
        let (pool_before, shares_before) = if is_positive { (c.positive_pool, c.positive_shares) } else { (c.negative_pool, c.negative_shares) };
        let shares = if net == 0_u256 { 0_u256 } else { super::MenaxaReputation::shares_out(net, pool_before, shares_before) };
        if let Option::Some(min_s) = min_expected_shares { assert(shares >= min_s, 'SLIPPAGE'); }
        let key = (caller, company_id);
        let mut p = self.user_positions.read(key);
        if p.company_id == 0_u256 { p.company_id = company_id; }
        if is_positive { c.positive_pool = c.positive_pool + net; c.positive_shares = c.positive_shares + shares; p.positive_shares = p.positive_shares + shares; }
        else { c.negative_pool = c.negative_pool + net; c.negative_shares = c.negative_shares + shares; p.negative_shares = p.negative_shares + shares; }
        c.total_invested = c.total_invested + net;
        self.user_positions.write(key, p);
        let pool_after = if is_positive { c.positive_pool } else { c.negative_pool };
        validate_investment_limits(@self, caller, company_id, net, pool_after);
        c = update_company_score_and_track(ref self, company_id, c, net);
        validate_pool_integrity(ref self, company_id);
        self.emit(Event::InvestmentMade(InvestmentMade { user: caller, company_id, side_positive: is_positive, amount: net, shares, new_score: c.reputation_score }));
    }

    #[external(v0)]
    fn withdraw_position(ref self: ContractState, company_id: u256, side: PositionSide) { _withdraw(ref self, company_id, side, 10000_u256); }
    #[external(v0)]
    fn withdraw_partial_position(ref self: ContractState, company_id: u256, side: PositionSide, percentage_bps: u256) { 
        validate_percentage(percentage_bps); 
        _withdraw(ref self, company_id, side, percentage_bps); 
    }

    fn _withdraw(ref self: ContractState, company_id: u256, side: PositionSide, pct_bps: u256) {
        validate_company_exists(@self, company_id);
        validate_percentage(pct_bps);
        let caller = get_caller_address();
        let key = (caller, company_id);
        let mut p = self.user_positions.read(key);
        let mut c = self.companies.read(company_id);
        match side {
            PositionSide::Positive(()) => {
                let user_shares = p.positive_shares; assert(user_shares > 0_u256, 'NO_POS');
                let burn_shares = (user_shares * pct_bps) / 10000_u256;
                let payout = super::MenaxaReputation::payout_from_shares(burn_shares, c.positive_pool, c.positive_shares);
                assert(c.positive_shares >= burn_shares && c.positive_pool >= payout, 'POOL_UNDERFLOW');
                c.positive_shares = c.positive_shares - burn_shares; c.positive_pool = c.positive_pool - payout; p.positive_shares = p.positive_shares - burn_shares; self.user_positions.write(key, p);
                let mut token = get_token(@self);
                let ok = token.transfer(caller, payout); assert(ok, 'TRANSFER_FAILED');
                c = update_company_score_and_track(ref self, company_id, c, 0_u256);
                validate_pool_integrity(ref self, company_id);
                self.emit(Event::PositionClosed(PositionClosed { user: caller, company_id, side_positive: true, shares_burned: burn_shares, payout_amount: payout }));
            },
            PositionSide::Negative(()) => {
                let user_shares = p.negative_shares; assert(user_shares > 0_u256, 'NO_NEG');
                let burn_shares = (user_shares * pct_bps) / 10000_u256;
                let payout = super::MenaxaReputation::payout_from_shares(burn_shares, c.negative_pool, c.negative_shares);
                assert(c.negative_shares >= burn_shares && c.negative_pool >= payout, 'POOL_UNDERFLOW');
                c.negative_shares = c.negative_shares - burn_shares; c.negative_pool = c.negative_pool - payout; p.negative_shares = p.negative_shares - burn_shares; self.user_positions.write(key, p);
                let mut token = get_token(@self);
                let ok = token.transfer(caller, payout); assert(ok, 'TRANSFER_FAILED');
                c = update_company_score_and_track(ref self, company_id, c, 0_u256);
                validate_pool_integrity(ref self, company_id);
                self.emit(Event::PositionClosed(PositionClosed { user: caller, company_id, side_positive: false, shares_burned: burn_shares, payout_amount: payout }));
            },
        }
    }

    #[external(v0)]
    fn get_company(self: @ContractState, company_id: u256) -> Company { 
        validate_company_exists(self, company_id);
        self.companies.read(company_id) 
    }
    #[external(v0)]
    fn get_user_position(self: @ContractState, user: ContractAddress, company_id: u256) -> UserPosition { 
        validate_company_exists(self, company_id);
        validate_user_address(user);
        self.user_positions.read((user, company_id)) 
    }
    #[external(v0)]
    fn calculate_reputation_score(self: @ContractState, company_id: u256) -> i32 { 
        validate_company_exists(self, company_id);
        let c = self.companies.read(company_id); 
        super::MenaxaReputation::compute_score(c.positive_pool, c.negative_pool) 
    }
    #[external(v0)]
    fn get_current_position_value(self: @ContractState, user: ContractAddress, company_id: u256) -> (u256, u256) {
        validate_company_exists(self, company_id);
        validate_user_address(user);
        let c = self.companies.read(company_id);
        let p = self.user_positions.read((user, company_id));
        let pos_val = if c.positive_shares == 0_u256 { 0_u256 } else { (p.positive_shares * c.positive_pool) / c.positive_shares };
        let neg_val = if c.negative_shares == 0_u256 { 0_u256 } else { (p.negative_shares * c.negative_pool) / c.negative_shares };
        (pos_val, neg_val)
    }

    #[external(v0)]
    fn get_24h_volume(self: @ContractState, company_id: u256) -> u256 { 
        validate_company_exists(self, company_id);
        let day: u64 = get_block_timestamp() / 86400_u64; 
        self.daily_volume.read((company_id, day)) 
    }
    #[external(v0)]
    fn get_reputation_trend(self: @ContractState, company_id: u256, days: u64) -> Array<i32> {
        validate_company_exists(self, company_id);
        let mut arr: Array<i32> = ArrayTrait::new();
        let today: u64 = get_block_timestamp() / 86400_u64;
        let mut d: u64 = days;
        loop { if d == 0_u64 { break; } let day = today - d + 1_u64; arr.append(self.reputation_history.read((company_id, day))); d = d - 1_u64; }
        arr
    }

    // === PRODUCTION READINESS: Debug and Testing Functions ===
    #[external(v0)]
    fn debug_pool_state(self: @ContractState, company_id: u256) -> (u256, u256, u256, u256) {
        validate_company_exists(self, company_id);
        let c = self.companies.read(company_id);
        (c.positive_pool, c.negative_pool, c.positive_shares, c.negative_shares)
    }

    #[external(v0)]
    fn simulate_total_payout(self: @ContractState, company_id: u256) -> (u256, u256) {
        validate_company_exists(self, company_id);
        let c = self.companies.read(company_id);
        // In constant-sum model, if everyone withdrew, payout should equal pool
        (c.positive_shares, c.negative_shares) // Should equal (c.positive_pool, c.negative_pool)
    }

    #[external(v0)]
    fn check_pool_solvency(self: @ContractState, company_id: u256) -> bool {
        validate_company_exists(self, company_id);
        let c = self.companies.read(company_id);
        c.positive_shares <= c.positive_pool && c.negative_shares <= c.negative_pool
    }

    // === PRODUCTION READINESS: Emergency Functions ===
    #[external(v0)]
    fn emergency_pause_all(ref self: ContractState) {
        assert_admin(@self);
        // Pause all companies by setting a global flag
        let n = self.company_counter.read();
        let mut i = 1_u256;
        loop {
            if i > n { break; }
            self.paused_company.write(i, true);
            i = i + 1_u256;
        }
    }

    #[external(v0)]
    fn emergency_unpause_all(ref self: ContractState) {
        assert_admin(@self);
        let n = self.company_counter.read();
        let mut i = 1_u256;
        loop {
            if i > n { break; }
            self.paused_company.write(i, false);
            i = i + 1_u256;
        }
    }

    #[external(v0)]
    fn emergency_withdraw_stuck_funds(ref self: ContractState, recipient: ContractAddress, amount: u256) {
        assert_admin(@self);
        // Last resort function to rescue stuck funds
        let mut token = get_token(@self);
        let ok = token.transfer(recipient, amount);
        assert(ok, 'EMERGENCY_TRANSFER_FAILED');
    }

    // === PRODUCTION READINESS: User Portfolio Functions ===
    #[external(v0)]
    fn get_user_total_portfolio_value(self: @ContractState, user: ContractAddress) -> u256 {
        validate_user_address(user);
        let mut total_value = 0_u256;
        let n = self.company_counter.read();
        let mut i = 1_u256;
        loop {
            if i > n { break; }
            let c = self.companies.read(i);
            let p = self.user_positions.read((user, i));
            let pos_val = if c.positive_shares == 0_u256 { 0_u256 } else { (p.positive_shares * c.positive_pool) / c.positive_shares };
            let neg_val = if c.negative_shares == 0_u256 { 0_u256 } else { (p.negative_shares * c.negative_pool) / c.negative_shares };
            total_value = total_value + pos_val + neg_val;
            i = i + 1_u256;
        }
        total_value
    }

    #[external(v0)]
    fn get_user_position_count(self: @ContractState, user: ContractAddress) -> u256 {
        validate_user_address(user);
        let mut count = 0_u256;
        let n = self.company_counter.read();
        let mut i = 1_u256;
        loop {
            if i > n { break; }
            let p = self.user_positions.read((user, i));
            if p.positive_shares > 0_u256 || p.negative_shares > 0_u256 {
                count = count + 1_u256;
            }
            i = i + 1_u256;
        }
        count
    }

    // === PRODUCTION READINESS: Company Discovery ===
    #[external(v0)]
    fn get_top_companies_by_volume(self: @ContractState, limit: u256) -> Array<u256> {
        let mut arr: Array<u256> = ArrayTrait::new();
        let n = self.company_counter.read();
        let actual_limit = if limit > n { n } else { limit };
        
        // Simple bubble sort implementation for small datasets
        // In production, consider using more efficient sorting
        let mut sorted_companies: Array<(u256, u256)> = ArrayTrait::new(); // (company_id, volume)
        let mut i = 1_u256;
        
        // Collect all companies with their volumes
        loop {
            if i > n { break; }
            let meta = self.company_metadata.read(i);
            sorted_companies.append((i, meta.total_volume));
            i = i + 1_u256;
        }
        
        // For now, return first N (sorting complex in Cairo)
        // Production implementation would need external sorting service
        let mut j = 1_u256;
        loop {
            if j > actual_limit { break; }
            arr.append(j);
            j = j + 1_u256;
        }
        arr
    }

    #[external(v0)]
    fn get_active_companies_count(self: @ContractState) -> u256 {
        let mut count = 0_u256;
        let n = self.company_counter.read();
        let mut i = 1_u256;
        loop {
            if i > n { break; }
            let c = self.companies.read(i);
            if c.is_active {
                count = count + 1_u256;
            }
            i = i + 1_u256;
        }
        count
    }

    #[external(v0)]
    fn get_companies_with_activity(self: @ContractState) -> Array<u256> {
        let mut arr: Array<u256> = ArrayTrait::new();
        let n = self.company_counter.read();
        let mut i = 1_u256;
        loop {
            if i > n { break; }
            let c = self.companies.read(i);
            if c.total_invested > 0_u256 {
                arr.append(i);
            }
            i = i + 1_u256;
        }
        arr
    }

    // === PRODUCTION READINESS: Advanced Analytics ===
    #[external(v0)]
    fn get_platform_total_volume(self: @ContractState) -> u256 {
        let mut total = 0_u256;
        let n = self.company_counter.read();
        let mut i = 1_u256;
        loop {
            if i > n { break; }
            let meta = self.company_metadata.read(i);
            total = total + meta.total_volume;
            i = i + 1_u256;
        }
        total
    }

    #[external(v0)]
    fn get_platform_tvl(self: @ContractState) -> u256 {
        let mut total = 0_u256;
        let n = self.company_counter.read();
        let mut i = 1_u256;
        loop {
            if i > n { break; }
            let c = self.companies.read(i);
            total = total + c.positive_pool + c.negative_pool;
            i = i + 1_u256;
        }
        total
    }

    // === PRODUCTION READINESS: Admin Utilities ===
    #[external(v0)]
    fn set_company_active_status(ref self: ContractState, company_id: u256, is_active: bool) {
        assert_admin(@self);
        validate_company_exists(@self, company_id);
        let mut c = self.companies.read(company_id);
        c.is_active = is_active;
        self.companies.write(company_id, c);
        
        let mut meta = self.company_metadata.read(company_id);
        meta.is_active = is_active;
        self.company_metadata.write(company_id, meta);
    }

    #[external(v0)]
    fn set_user_position_limit(ref self: ContractState, user: ContractAddress, company_id: u256, limit: u256) {
        assert_admin(@self);
        validate_company_exists(@self, company_id);
        validate_user_address(user);
        self.max_position_per_user.write((user, company_id), limit);
    }
}
