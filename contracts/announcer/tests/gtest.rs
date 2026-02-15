use announcer_client::{Announcement, AnnouncerClient, AnnouncerClientCtors, Chain, announcer::*};
use sails_rs::{client::*, gtest::*, hex, prelude::*};

const ACTOR_ID: u64 = 42;

#[tokio::test]
async fn test_announcer() {
    let system = System::new();
    system.init_logger_with_default_filter("gwasm=debug,gtest=info,sails_rs=debug");
    system.mint_to(ACTOR_ID, 100_000_000_000_000);
    let program_code_id = system.submit_code(announcer::WASM_BINARY);

    let env = GtestEnv::new(system, ACTOR_ID.into());

    let announcer_program = env
        .deploy::<announcer_client::AnnouncerClientProgram>(program_code_id, b"salt".to_vec())
        .new()
        .await
        .unwrap();

    let mut announcer_service_client = announcer_program.announcer();

    let announcement1 = Announcement {
        stealth_address: ActorId::zero(),
        caller: ActorId::zero(),
        ephemeral_pub_key: hex::decode(
            "031b84c5567b126440995d3ed5aaba0565d71e1834604819ff9c17f5e9d5dd078f",
        )
        .unwrap(),
        metadata: vec![0],
        chain: Chain::Ethereum,
    };
    announcer_service_client
        .announce(announcement1.clone())
        .await
        .unwrap();

    let announcements_len = announcer_service_client.announcements_len().await.unwrap();
    let announcements = announcer_service_client.announcements(0, 10).await.unwrap();
    assert_eq!(announcements_len, 1);
    assert_eq!(announcements.len(), 1);
    assert_eq!(announcements[0], announcement1);

    let announcement2 = Announcement {
        stealth_address: ActorId::zero(),
        caller: ActorId::zero(),
        ephemeral_pub_key: hex::decode(
            "031b84c5567b126440995d3ed5aaba0565d71e1834604819ff9c17f5e9d5dd078f",
        )
        .unwrap(),
        metadata: vec![0],
        chain: Chain::Ethereum,
    };
    announcer_service_client
        .announce(announcement2.clone())
        .await
        .unwrap();

    let announcements_len = announcer_service_client.announcements_len().await.unwrap();
    let announcements = announcer_service_client.announcements(1, 10).await.unwrap();
    assert_eq!(announcements_len, 2);
    assert_eq!(announcements.len(), 1);
    assert_eq!(announcements[0], announcement2);
}
