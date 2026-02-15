use registry_client::{RegistryClient, RegistryClientCtors, registry::*};
use sails_rs::{H160, client::*, gtest::*, hex};

const ACTOR_ID: u64 = 42;

#[tokio::test]
async fn test_registry() {
    let system = System::new();
    system.init_logger_with_default_filter("gwasm=debug,gtest=info,sails_rs=debug");
    system.mint_to(ACTOR_ID, 100_000_000_000_000);
    let program_code_id = system.submit_code(registry::WASM_BINARY);

    let env = GtestEnv::new(system, ACTOR_ID.into());

    let registry_program = env
        .deploy::<registry_client::RegistryClientProgram>(program_code_id, b"salt".to_vec())
        .new()
        .await
        .unwrap();

    let mut registry_service_client = registry_program.registry();

    let ethereum_address = H160::random();
    let stealth_meta_address = [0xff; 66];
    let stealth_meta_address_hex = format!("0x{}", hex::encode(stealth_meta_address));

    registry_service_client
        .register_keys(ethereum_address, stealth_meta_address_hex.clone())
        .await
        .unwrap();

    let retrieved_stealth_meta_address = registry_service_client
        .stealth_meta_address_of(ethereum_address)
        .await
        .unwrap();
    assert_eq!(
        retrieved_stealth_meta_address,
        Some(stealth_meta_address_hex)
    );
}
