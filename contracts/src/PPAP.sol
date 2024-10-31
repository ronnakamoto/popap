// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract ProofOfPhysicalAttendance is
    ERC721,
    Ownable,
    Pausable,
    ReentrancyGuard
{
    using Counters for Counters.Counter;
    using Strings for uint256;

    Counters.Counter private _eventIds;
    Counters.Counter private _tokenIds;

    uint256 private constant FIXED_POINT = 1e8;
    uint256 private constant PI =
        314159265358979323846264338327950288419716939937510;
    uint256 private constant HALF_PI = PI / 2;
    uint256 private constant TWO_PI = PI * 2;
    uint256 private constant EARTH_RADIUS_METERS = 6371000 * FIXED_POINT; // Earth's radius in meters
    uint256 private constant METERS_PER_MILE = 1609 * FIXED_POINT; // Meters in a mile
    uint256 private constant SCALING_FACTOR = 1e5; // For coordinates
    uint256 private constant DISTANCE_PRECISION = 1e3; // For distance calculations

    struct GeoCoordinate {
        uint128 latitude;
        bool latitudeIsNegative;
        uint128 longitude;
        bool longitudeIsNegative;
    }

    struct Event {
        string name;
        string description;
        uint64 startTime;
        uint64 endTime;
        GeoCoordinate location;
        uint128 radiusMiles;
        address organizer;
        bool isActive;
        uint256 maxAttendees;
        uint256 currentAttendees;
        uint256 minStayMinutes;
    }

    struct AttendanceProof {
        uint256 eventId;
        address attendee;
        uint64 checkInTime;
        uint64 checkOutTime;
        GeoCoordinate checkInLocation;
        bool isVerified;
    }

    mapping(uint256 => Event) public events;
    mapping(uint256 => AttendanceProof) public proofs;
    mapping(uint256 => mapping(address => bool)) public hasAttended;
    mapping(uint256 => mapping(address => uint64)) public checkInTimes;
    mapping(address => bool) public verifiedOrganizers;

    event EventCreated(
        uint256 indexed eventId,
        string name,
        address indexed organizer
    );
    event AttendanceVerified(
        uint256 indexed eventId,
        uint256 indexed tokenId,
        address indexed attendee
    );

    error Unauthorized();
    error InvalidParameters();
    error EventNotActive();
    error EventNotInProgress();
    error AlreadyAttended();
    error OutsideGeofence();
    error MinimumStayNotMet();

    constructor() ERC721("Proof of Physical Attendance", "PPAP") {
        verifiedOrganizers[msg.sender] = true;
        _transferOwnership(msg.sender);
    }

    function createEvent(
        string memory name,
        string memory description,
        uint64 startTime,
        uint64 endTime,
        uint128 latitude,
        bool latitudeIsNegative,
        uint128 longitude,
        bool longitudeIsNegative,
        uint128 radiusMiles,
        uint256 maxAttendees,
        uint256 minStayMinutes
    ) external whenNotPaused returns (uint256) {
        if (!verifiedOrganizers[msg.sender]) revert Unauthorized();
        if (startTime <= block.timestamp || endTime <= startTime)
            revert InvalidParameters();

        uint256 eventId = _eventIds.current();
        _eventIds.increment();

        events[eventId] = Event({
            name: name,
            description: description,
            startTime: startTime,
            endTime: endTime,
            location: GeoCoordinate(
                latitude,
                latitudeIsNegative,
                longitude,
                longitudeIsNegative
            ),
            radiusMiles: radiusMiles,
            organizer: msg.sender,
            isActive: true,
            maxAttendees: maxAttendees,
            currentAttendees: 0,
            minStayMinutes: minStayMinutes
        });

        emit EventCreated(eventId, name, msg.sender);
        return eventId;
    }

    function checkIn(
        uint256 eventId,
        uint128 latitude,
        bool latitudeIsNegative,
        uint128 longitude,
        bool longitudeIsNegative
    ) external whenNotPaused nonReentrant {
        Event storage event_ = events[eventId];

        if (!event_.isActive) revert EventNotActive();
        if (
            block.timestamp < event_.startTime ||
            block.timestamp > event_.endTime
        ) revert EventNotInProgress();
        if (hasAttended[eventId][msg.sender]) revert AlreadyAttended();

        if (
            !_isWithinGeofence(
                event_.location,
                GeoCoordinate(
                    latitude,
                    latitudeIsNegative,
                    longitude,
                    longitudeIsNegative
                ),
                event_.radiusMiles
            )
        ) revert OutsideGeofence();

        checkInTimes[eventId][msg.sender] = uint64(block.timestamp);
        event_.currentAttendees++;
    }

    function checkOut(
        uint256 eventId,
        uint128 latitude,
        bool latitudeIsNegative,
        uint128 longitude,
        bool longitudeIsNegative
    ) external whenNotPaused nonReentrant {
        uint64 checkInTime = checkInTimes[eventId][msg.sender];
        if (checkInTime == 0) revert Unauthorized();

        Event storage event_ = events[eventId];
        if (block.timestamp - checkInTime < event_.minStayMinutes * 60)
            revert MinimumStayNotMet();

        if (
            !_isWithinGeofence(
                event_.location,
                GeoCoordinate(
                    latitude,
                    latitudeIsNegative,
                    longitude,
                    longitudeIsNegative
                ),
                event_.radiusMiles
            )
        ) revert OutsideGeofence();

        uint256 tokenId = _tokenIds.current();
        _tokenIds.increment();
        _safeMint(msg.sender, tokenId);

        proofs[tokenId] = AttendanceProof({
            eventId: eventId,
            attendee: msg.sender,
            checkInTime: checkInTime,
            checkOutTime: uint64(block.timestamp),
            checkInLocation: GeoCoordinate(
                latitude,
                latitudeIsNegative,
                longitude,
                longitudeIsNegative
            ),
            isVerified: true
        });

        hasAttended[eventId][msg.sender] = true;
        emit AttendanceVerified(eventId, tokenId, msg.sender);
    }

    function _calculateDistance(
        uint128 lat1,
        uint128 lon1,
        uint128 lat2,
        uint128 lon2
    ) private pure returns (uint256) {
        // Calculate coordinate differences preserving precision
        uint256 latDiff = lat1 > lat2 ? lat1 - lat2 : lat2 - lat1;
        uint256 lonDiff = lon1 > lon2 ? lon1 - lon2 : lon2 - lon1;

        // Use Pythagorean theorem with full precision
        return sqrt((latDiff * latDiff) + (lonDiff * lonDiff));
    }

    function sqrt(uint256 x) private pure returns (uint256) {
        if (x == 0) return 0;

        uint256 z = (x + 1) / 2;
        uint256 y = x;

        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }

        return y;
    }

    function _isWithinGeofence(
        GeoCoordinate memory eventLocation,
        GeoCoordinate memory attendeeLocation,
        uint128 radiusMiles
    ) private pure returns (bool) {
        uint256 distance = _calculateDistance(
            eventLocation.latitude,
            eventLocation.longitude,
            attendeeLocation.latitude,
            attendeeLocation.longitude
        );

        // GENIUS PART: Instead of scaling down distance, scale up radius!
        // For small radius (≤10 miles), 1 mile = 145 coordinate units
        if (radiusMiles <= 10) {
            // Scale radius up: radius * 145 units/mile
            return distance < uint256(radiusMiles) * 145;
        }

        // For large radius (>10), use direct unit comparison
        return distance < radiusMiles;
    }

    function addOrganizer(address organizer) external onlyOwner {
        verifiedOrganizers[organizer] = true;
    }

    function removeOrganizer(address organizer) external onlyOwner {
        verifiedOrganizers[organizer] = false;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function tokenURI(
        uint256 tokenId
    ) public view virtual override returns (string memory) {
        ownerOf(tokenId); // This will revert if token doesn't exist

        AttendanceProof memory proof = proofs[tokenId];
        Event memory event_ = events[proof.eventId];
        return
            string(
                abi.encodePacked(
                    "Attendance Proof for ",
                    event_.name,
                    " - Token #",
                    tokenId.toString()
                )
            );
    }
}
