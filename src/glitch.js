// Heisenbug hook. Every command a robot receives passes through here before it reaches the motors.
// In the base game this is a pass-through; the Heisenbug milestone makes it corrupt the commands of
// the one robot that is secretly glitched in the current run.

export function applyGlitch(robot, command, state) {
  return command;
}
