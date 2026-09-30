// Changing floors. The stairs by Rooms 4 and 9 are instant but Biggy cannot climb them; the
// service lift takes anyone, but only with power, and it takes a while: the robot waits in the
// cabin, then arrives.

const STAIR_CLIMBERS = new Set(['voxxy', 'droid']);
export const LIFT_RIDE_DURATION = 6;   // s — long enough for a few bars of the elevator music

export function createTravel() {
  return { rides: [] };            // { robot, destination, remaining }
}

export function isRiding(travel, robot) {
  return travel.rides.some(ride => ride.robot === robot);
}

/** Uses the interact key at a stair or lift end. Returns true when the action was used here. */
export function travelAct(state, robot) {
  if (!robot.command.action || isRiding(state.travel, robot)) {
    return false;
  }
  const found = findEnd(state.level, robot);
  if (!found) {
    return false;
  }
  const { link, end } = found;
  if (link.kind === 'stairs' && !STAIR_CLIMBERS.has(robot.type)) {
    return true; // the prompt explains why; the key press is still used up
  }
  if (link.kind === 'lift' && !state.mission.power) {
    return true; // the prompt explains why; the key press is still used up
  }
  const destination = link.ends.find(other => other !== end);
  if (link.kind === 'lift') {
    state.travel.rides.push({ robot, destination, remaining: LIFT_RIDE_DURATION });
    stop(robot);
  } else {
    arrive(robot, destination);
  }
  return true;
}

export function updateTravel(state, dt) {
  const travel = state.travel;
  for (const ride of travel.rides) {
    ride.remaining -= dt;
    stop(ride.robot);
    if (ride.remaining <= 0) {
      arrive(ride.robot, ride.destination);
    }
  }
  travel.rides = travel.rides.filter(ride => ride.remaining > 0);
}

export function travelPrompt(state, robot) {
  const ride = state.travel.rides.find(candidate => candidate.robot === robot);
  if (ride) {
    return `Service lift… ${Math.ceil(ride.remaining)}`;
  }
  const found = findEnd(state.level, robot);
  if (!found) {
    return '';
  }
  if (found.link.kind === 'stairs' && !STAIR_CLIMBERS.has(robot.type)) {
    return `Stairs. ${robot.spec.name} does not do stairs — it needs the service lift.`;
  }
  if (found.link.kind === 'lift' && !state.mission.power) {
    return 'Service lift — dead. The main breaker in the electrical room has tripped.';
  }
  return `E — ${found.end.label.charAt(0).toLowerCase()}${found.end.label.slice(1)}`;
}

function findEnd(level, robot) {
  for (const link of level.links) {
    for (const end of link.ends) {
      if (Math.hypot(robot.x - end.x, robot.y - end.y) < end.radius + robot.radius) {
        return { link, end };
      }
    }
  }
  return null;
}

function arrive(robot, destination) {
  robot.x = destination.exit.x;
  robot.y = destination.exit.y;
  stop(robot);
}

function stop(robot) {
  robot.vx = 0;
  robot.vy = 0;
  robot.throttle = 0;
}
