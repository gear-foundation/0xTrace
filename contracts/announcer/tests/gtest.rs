use announcer_client::{Announcement, AnnouncerClient, AnnouncerClientCtors, announcer::*};
use sails_rs::{H160, client::*, gtest::*};

const ACTOR_ID: u64 = 42;

#[tokio::test]
async fn do_something_works() {
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
        stealth_address: H160::random(),
        caller: H160::random(),
        ephemeral_pub_key: vec![1; 33],
        metadata: vec![2],
    };
    announcer_service_client
        .announce(announcement1.clone())
        .await
        .unwrap();

    let announcements = announcer_service_client.announcements(0, 10).await.unwrap();
    assert_eq!(announcements.len(), 1);
    assert_eq!(announcements[0], announcement1);

    let announcement2 = Announcement {
        stealth_address: H160::random(),
        caller: H160::random(),
        ephemeral_pub_key: vec![3; 33],
        metadata: vec![4],
    };
    announcer_service_client
        .announce(announcement2.clone())
        .await
        .unwrap();

    let announcements = announcer_service_client.announcements(1, 10).await.unwrap();
    assert_eq!(announcements.len(), 1);
    assert_eq!(announcements[0], announcement2);
}
