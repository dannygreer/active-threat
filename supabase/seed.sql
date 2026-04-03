-- Seed: Active Threat Workplace Response Scenario (active_threat_v1)
-- Run AFTER migration.sql in the Supabase SQL Editor

DO $$
DECLARE
  v_scenario uuid;
  v_screen uuid;
BEGIN

  -- ============================
  -- Insert scenario
  -- ============================
  INSERT INTO scenarios (scenario_id, version, title, entry_screen_id, is_active)
  VALUES ('active_threat_v1', 'v1', 'Active Threat Workplace Response', 'S1_START', true)
  RETURNING id INTO v_scenario;

  -- ============================
  -- S1_START — Common Entry
  -- ============================
  INSERT INTO scenario_screens (scenario_fk, screen_id, screen_text, timer_seconds, sort_order)
  VALUES (v_scenario, 'S1_START',
    'You are at work in a large office building during a normal weekday. You hear several loud popping sounds from another part of the building. People nearby pause, look around, and seem confused. No official announcement has been made.',
    30, 1)
  RETURNING id INTO v_screen;

  INSERT INTO screen_options (screen_fk, option_label, option_text, next_screen_id, sort_order) VALUES
    (v_screen, 'A', 'Continue trying to confirm what is happening', 'A2_CONFIRM_1', 1),
    (v_screen, 'B', 'Move quickly to find a secure place to hide', 'B2_HIDE_1', 2),
    (v_screen, 'C', 'Run toward an exit without stopping', 'C2_RUN_1', 3),
    (v_screen, 'D', 'Call 911 while staying in place', 'D2_CALL_1', 4);

  -- ============================
  -- BRANCH A — CONFIRM
  -- ============================

  -- A2_CONFIRM_1
  INSERT INTO scenario_screens (scenario_fk, screen_id, screen_text, timer_seconds, sort_order)
  VALUES (v_scenario, 'A2_CONFIRM_1',
    'You stay in place for a moment, trying to figure out what is going on. The popping sounds continue. Several people begin running down the hallway past you, and one of them yells, "Run!"',
    30, 2)
  RETURNING id INTO v_screen;

  INSERT INTO screen_options (screen_fk, option_label, option_text, next_screen_id, sort_order) VALUES
    (v_screen, 'A', 'Stay where you are and keep observing', 'A3_CONFIRM_2', 1),
    (v_screen, 'B', 'Move toward the sound to see what is happening', 'A3_CONFIRM_2', 2),
    (v_screen, 'C', 'Start moving toward an exit', 'A3_CONFIRM_2', 3),
    (v_screen, 'D', 'Call 911 now', 'A3_CONFIRM_2', 4);

  -- A3_CONFIRM_2
  INSERT INTO scenario_screens (scenario_fk, screen_id, screen_text, timer_seconds, sort_order)
  VALUES (v_scenario, 'A3_CONFIRM_2',
    'You now hear screaming. A terrified coworker runs by and says people have been shot. You still do not see the shooter.',
    30, 3)
  RETURNING id INTO v_screen;

  INSERT INTO screen_options (screen_fk, option_label, option_text, next_screen_id, sort_order) VALUES
    (v_screen, 'A', 'Keep trying to confirm exactly where the shooter is', 'A4_CONFIRM_3', 1),
    (v_screen, 'B', 'Move quickly to a place where you can hide', 'A4_CONFIRM_3', 2),
    (v_screen, 'C', 'Run immediately toward the nearest exit', 'A4_CONFIRM_3', 3),
    (v_screen, 'D', 'Call 911 while moving', 'A4_CONFIRM_3', 4);

  -- A4_CONFIRM_3
  INSERT INTO scenario_screens (scenario_fk, screen_id, screen_text, timer_seconds, sort_order)
  VALUES (v_scenario, 'A4_CONFIRM_3',
    'As you move, you look down the hallway and see a person collapse to the ground after being shot. Panic spreads. You realize the threat is much closer than you thought.',
    30, 4)
  RETURNING id INTO v_screen;

  INSERT INTO screen_options (screen_fk, option_label, option_text, next_screen_id, sort_order) VALUES
    (v_screen, 'A', 'Freeze and keep watching to understand where the shooter is', 'S5_CONVERGENCE', 1),
    (v_screen, 'B', 'Move into the nearest room and secure it', 'S5_CONVERGENCE', 2),
    (v_screen, 'C', 'Run for an exit immediately', 'S5_CONVERGENCE', 3),
    (v_screen, 'D', 'Drop down, get out of sight, and call 911', 'S5_CONVERGENCE', 4);

  -- ============================
  -- BRANCH B — HIDE
  -- ============================

  -- B2_HIDE_1
  INSERT INTO scenario_screens (scenario_fk, screen_id, screen_text, timer_seconds, sort_order)
  VALUES (v_scenario, 'B2_HIDE_1',
    'You move quickly into a nearby office and close the door behind you. You are alone inside. The hallway outside is noisy and chaotic.',
    30, 2)
  RETURNING id INTO v_screen;

  INSERT INTO screen_options (screen_fk, option_label, option_text, next_screen_id, sort_order) VALUES
    (v_screen, 'A', 'Lock and barricade the door', 'B3_HIDE_2', 1),
    (v_screen, 'B', 'Stay quiet and wait without doing anything else', 'B3_HIDE_2', 2),
    (v_screen, 'C', 'Call 911 immediately', 'B3_HIDE_2', 3),
    (v_screen, 'D', 'Leave the room and try to find a better hiding place', 'B3_HIDE_2', 4);

  -- B3_HIDE_2
  INSERT INTO scenario_screens (scenario_fk, screen_id, screen_text, timer_seconds, sort_order)
  VALUES (v_scenario, 'B3_HIDE_2',
    'Through the narrow window in the door, you see a person get shot in the hallway and fall. You hear more screaming and rapid footsteps.',
    30, 3)
  RETURNING id INTO v_screen;

  INSERT INTO screen_options (screen_fk, option_label, option_text, next_screen_id, sort_order) VALUES
    (v_screen, 'A', 'Stay hidden and silent', 'B4_HIDE_3', 1),
    (v_screen, 'B', 'Open the door and try to help the injured person', 'B4_HIDE_3', 2),
    (v_screen, 'C', 'Call 911 while remaining hidden', 'B4_HIDE_3', 3),
    (v_screen, 'D', 'Attempt to leave the room and escape another way', 'B4_HIDE_3', 4);

  -- B4_HIDE_3
  INSERT INTO scenario_screens (scenario_fk, screen_id, screen_text, timer_seconds, sort_order)
  VALUES (v_scenario, 'B4_HIDE_3',
    'The footsteps get closer. Someone grabs the door handle and starts trying to force the door open.',
    30, 4)
  RETURNING id INTO v_screen;

  INSERT INTO screen_options (screen_fk, option_label, option_text, next_screen_id, sort_order) VALUES
    (v_screen, 'A', 'Hold the door, stay quiet, and keep the room secured', 'S5_CONVERGENCE', 1),
    (v_screen, 'B', 'Try to escape through another exit if one exists', 'S5_CONVERGENCE', 2),
    (v_screen, 'C', 'Call 911 and whisper what is happening', 'S5_CONVERGENCE', 3),
    (v_screen, 'D', 'Prepare to physically confront if the shooter enters', 'S5_CONVERGENCE', 4);

  -- ============================
  -- BRANCH C — RUN
  -- ============================

  -- C2_RUN_1
  INSERT INTO scenario_screens (scenario_fk, screen_id, screen_text, timer_seconds, sort_order)
  VALUES (v_scenario, 'C2_RUN_1',
    'You start running toward the nearest exit. Other employees are also running, and several people are yelling conflicting directions.',
    30, 2)
  RETURNING id INTO v_screen;

  INSERT INTO screen_options (screen_fk, option_label, option_text, next_screen_id, sort_order) VALUES
    (v_screen, 'A', 'Continue toward the nearest exit as fast as possible', 'C3_RUN_2', 1),
    (v_screen, 'B', 'Change direction and look for another exit', 'C3_RUN_2', 2),
    (v_screen, 'C', 'Stop to help a person who has fallen', 'C3_RUN_2', 3),
    (v_screen, 'D', 'Call 911 while moving', 'C3_RUN_2', 4);

  -- C3_RUN_2
  INSERT INTO scenario_screens (scenario_fk, screen_id, screen_text, timer_seconds, sort_order)
  VALUES (v_scenario, 'C3_RUN_2',
    'You hear gunshots much closer now. The path ahead becomes crowded and people are beginning to panic and push.',
    30, 3)
  RETURNING id INTO v_screen;

  INSERT INTO screen_options (screen_fk, option_label, option_text, next_screen_id, sort_order) VALUES
    (v_screen, 'A', 'Push through the crowd toward the exit', 'C4_RUN_3', 1),
    (v_screen, 'B', 'Break away and find an alternate route', 'C4_RUN_3', 2),
    (v_screen, 'C', 'Drop out of sight and hide nearby', 'C4_RUN_3', 3),
    (v_screen, 'D', 'Slow down and try to direct others', 'C4_RUN_3', 4);

  -- C4_RUN_3
  INSERT INTO scenario_screens (scenario_fk, screen_id, screen_text, timer_seconds, sort_order)
  VALUES (v_scenario, 'C4_RUN_3',
    'As you turn a corner, you see someone collapse after being shot. The shooter may be nearby, though you still do not directly see him.',
    30, 4)
  RETURNING id INTO v_screen;

  INSERT INTO screen_options (screen_fk, option_label, option_text, next_screen_id, sort_order) VALUES
    (v_screen, 'A', 'Keep moving toward escape without stopping', 'S5_CONVERGENCE', 1),
    (v_screen, 'B', 'Move into the nearest room and secure it', 'S5_CONVERGENCE', 2),
    (v_screen, 'C', 'Try to help the wounded person', 'S5_CONVERGENCE', 3),
    (v_screen, 'D', 'Hide immediately and call 911', 'S5_CONVERGENCE', 4);

  -- ============================
  -- BRANCH D — CALL 911
  -- ============================

  -- D2_CALL_1
  INSERT INTO scenario_screens (scenario_fk, screen_id, screen_text, timer_seconds, sort_order)
  VALUES (v_scenario, 'D2_CALL_1',
    'You call 911 while staying where you are. The operator answers and asks what is happening. You can hear more popping sounds in the distance and people yelling nearby.',
    30, 2)
  RETURNING id INTO v_screen;

  INSERT INTO screen_options (screen_fk, option_label, option_text, next_screen_id, sort_order) VALUES
    (v_screen, 'A', 'Stay where you are and keep reporting details', 'D3_CALL_2', 1),
    (v_screen, 'B', 'Move while staying on the phone', 'D3_CALL_2', 2),
    (v_screen, 'C', 'Hang up and begin moving to safety', 'D3_CALL_2', 3),
    (v_screen, 'D', 'Tell nearby people to run while you stay on the line', 'D3_CALL_2', 4);

  -- D3_CALL_2
  INSERT INTO scenario_screens (scenario_fk, screen_id, screen_text, timer_seconds, sort_order)
  VALUES (v_scenario, 'D3_CALL_2',
    'The gunfire gets noticeably closer while you are still on the call. More people run past you, and one person screams that the shooter is coming this way.',
    30, 3)
  RETURNING id INTO v_screen;

  INSERT INTO screen_options (screen_fk, option_label, option_text, next_screen_id, sort_order) VALUES
    (v_screen, 'A', 'Stay on the call and remain where you are', 'D4_CALL_3', 1),
    (v_screen, 'B', 'Move immediately to a place to hide while staying on the phone', 'D4_CALL_3', 2),
    (v_screen, 'C', 'End the call and run toward an exit', 'D4_CALL_3', 3),
    (v_screen, 'D', 'Drop down out of sight and whisper to the operator', 'D4_CALL_3', 4);

  -- D4_CALL_3
  INSERT INTO scenario_screens (scenario_fk, screen_id, screen_text, timer_seconds, sort_order)
  VALUES (v_scenario, 'D4_CALL_3',
    'As you begin to move, you see a person in the hallway get shot and fall. Panic surges around you, and you realize the threat is now very close.',
    30, 4)
  RETURNING id INTO v_screen;

  INSERT INTO screen_options (screen_fk, option_label, option_text, next_screen_id, sort_order) VALUES
    (v_screen, 'A', 'Stay on the phone and keep reporting what you see', 'S5_CONVERGENCE', 1),
    (v_screen, 'B', 'Move into the nearest room and secure it', 'S5_CONVERGENCE', 2),
    (v_screen, 'C', 'Run immediately toward the nearest exit', 'S5_CONVERGENCE', 3),
    (v_screen, 'D', 'End the call and hide as fast as possible', 'S5_CONVERGENCE', 4);

  -- ============================
  -- CONVERGENCE — All paths merge
  -- ============================

  -- S5_CONVERGENCE
  INSERT INTO scenario_screens (scenario_fk, screen_id, screen_text, timer_seconds, sort_order)
  VALUES (v_scenario, 'S5_CONVERGENCE',
    'You are now in a confined area near the threat. This may be a room, hallway corner, office, or blocked access point depending on your earlier choices. You hear movement nearby, intermittent gunfire, and people crying. The shooter is close.',
    30, 5)
  RETURNING id INTO v_screen;

  INSERT INTO screen_options (screen_fk, option_label, option_text, next_screen_id, sort_order) VALUES
    (v_screen, 'A', 'Remain hidden and silent', 'S6_FINAL_PRESSURE', 1),
    (v_screen, 'B', 'Attempt to escape immediately', 'S6_FINAL_PRESSURE', 2),
    (v_screen, 'C', 'Communicate or call 911 while staying in position', 'S6_FINAL_PRESSURE', 3),
    (v_screen, 'D', 'Prepare to confront only if the threat enters your space', 'S6_FINAL_PRESSURE', 4);

  -- ============================
  -- FINAL PRESSURE — Shortest timer
  -- ============================

  -- S6_FINAL_PRESSURE
  INSERT INTO scenario_screens (scenario_fk, screen_id, screen_text, timer_seconds, sort_order)
  VALUES (v_scenario, 'S6_FINAL_PRESSURE',
    'You hear rapid footsteps immediately outside your location. The handle starts moving or someone is approaching directly toward your position. You must act now.',
    10, 6)
  RETURNING id INTO v_screen;

  INSERT INTO screen_options (screen_fk, option_label, option_text, next_screen_id, sort_order) VALUES
    (v_screen, 'A', 'Stay hidden and silent', null, 1),
    (v_screen, 'B', 'Attempt immediate escape', null, 2),
    (v_screen, 'C', 'Barricade and secure your position', null, 3),
    (v_screen, 'D', 'Prepare to confront if entry occurs', null, 4);

END $$;
