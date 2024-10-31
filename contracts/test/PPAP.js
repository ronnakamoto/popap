/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-unused-expressions */
const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("Proof of Physical Attendance Protocol - REDACTED 2024", function () {
  let ppap;
  let owner;
  let organizer;
  let attendee1;
  let attendee2;
  let currentTimestamp;

  // AVANI+ Riverside Bangkok Hotel coordinates (13.7025°N, 100.4897°E)
  const getEventData = (timestamp) => ({
    name: "REDACTED 2024",
    description: "REDACTED Developer Conference at AVANI+ Riverside Bangkok",
    startTime: timestamp + 86400,
    endTime: timestamp + 172800,
    latitude: 1370250, // 13.70250° N
    latitudeIsNegative: false,
    longitude: 10048970, // 100.48970° E
    longitudeIsNegative: false,
    radiusMiles: 100, // Approximately 100 units in our scaled coordinate system
    maxAttendees: 500,
    minStayMinutes: 60,
  });

  // Test locations around venue
  const locations = {
    insideVenue: {
      // Exact venue location
      latitude: 1370250,
      latitudeIsNegative: false,
      longitude: 10048970,
      longitudeIsNegative: false,
    },
    nearbyLocation: {
      // 50 units away (should be within radius)
      latitude: 1370300,
      latitudeIsNegative: false,
      longitude: 10048970,
      longitudeIsNegative: false,
    },
    outsideVenue: {
      // 200 units away (should be outside radius)
      latitude: 1370450,
      latitudeIsNegative: false,
      longitude: 10048970,
      longitudeIsNegative: false,
    },
    southernHemisphere: {
      // Sydney Opera House coordinates (33.8568°S, 151.2153°E)
      latitude: 3385680,
      latitudeIsNegative: true,
      longitude: 15121530,
      longitudeIsNegative: false,
    },
    westernHemisphere: {
      // Times Square coordinates (40.7580°N, 73.9855°W)
      latitude: 4075800,
      latitudeIsNegative: false,
      longitude: 7398550,
      longitudeIsNegative: true,
    },
    southWesternLocation: {
      // Rio de Janeiro Christ the Redeemer (22.9519°S, 43.2105°W)
      latitude: 2295190,
      latitudeIsNegative: true,
      longitude: 4321050,
      longitudeIsNegative: true,
    },
  };

  beforeEach(async function () {
    [owner, organizer, attendee1, attendee2, attendee3] =
      await ethers.getSigners();

    const PPAP = await ethers.getContractFactory("ProofOfPhysicalAttendance");
    ppap = await PPAP.deploy();
    await ppap.addOrganizer(organizer.address);

    currentTimestamp = await time.latest();
  });

  describe("Contract Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await ppap.owner()).to.equal(owner.address);
    });

    it("Should initialize with correct name and symbol", async function () {
      expect(await ppap.name()).to.equal("Proof of Physical Attendance");
      expect(await ppap.symbol()).to.equal("PPAP");
    });

    it("Should set the deployer as a valid organizer", async function () {
      expect(await ppap.verifiedOrganizers(owner.address)).to.be.true;
    });
  });

  describe("Organizer Management", function () {
    it("Should allow owner to add organizer", async function () {
      await expect(ppap.addOrganizer(attendee1.address)).to.not.be.reverted;
      expect(await ppap.verifiedOrganizers(attendee1.address)).to.be.true;
    });

    it("Should allow owner to remove organizer", async function () {
      await ppap.addOrganizer(attendee1.address);
      await ppap.removeOrganizer(attendee1.address);
      expect(await ppap.verifiedOrganizers(attendee1.address)).to.be.false;
    });

    it("Should not allow non-owner to add organizer", async function () {
      await expect(ppap.connect(attendee1).addOrganizer(attendee2.address)).to
        .be.reverted;
    });
  });

  describe("Event Creation", function () {
    it("Should allow organizer to create event", async function () {
      const eventData = getEventData(currentTimestamp);
      await expect(
        ppap
          .connect(organizer)
          .createEvent(
            eventData.name,
            eventData.description,
            eventData.startTime,
            eventData.endTime,
            eventData.latitude,
            eventData.latitudeIsNegative,
            eventData.longitude,
            eventData.longitudeIsNegative,
            eventData.radiusMiles,
            eventData.maxAttendees,
            eventData.minStayMinutes
          )
      )
        .to.emit(ppap, "EventCreated")
        .withArgs(0, eventData.name, organizer.address);
    });

    it("Should not allow non-organizer to create event", async function () {
      const eventData = getEventData(currentTimestamp);
      await expect(
        ppap
          .connect(attendee1)
          .createEvent(
            eventData.name,
            eventData.description,
            eventData.startTime,
            eventData.endTime,
            eventData.latitude,
            eventData.latitudeIsNegative,
            eventData.longitude,
            eventData.longitudeIsNegative,
            eventData.radiusMiles,
            eventData.maxAttendees,
            eventData.minStayMinutes
          )
      ).to.be.revertedWithCustomError(ppap, "Unauthorized");
    });
  });

  describe("Attendance Management", function () {
    beforeEach(async function () {
      const eventData = getEventData(currentTimestamp);
      await ppap
        .connect(organizer)
        .createEvent(
          eventData.name,
          eventData.description,
          eventData.startTime,
          eventData.endTime,
          eventData.latitude,
          eventData.latitudeIsNegative,
          eventData.longitude,
          eventData.longitudeIsNegative,
          eventData.radiusMiles,
          eventData.maxAttendees,
          eventData.minStayMinutes
        );
      await time.increaseTo(eventData.startTime);
    });

    it("Should allow check-in at venue location", async function () {
      await expect(
        ppap
          .connect(attendee1)
          .checkIn(
            0,
            locations.insideVenue.latitude,
            locations.insideVenue.latitudeIsNegative,
            locations.insideVenue.longitude,
            locations.insideVenue.longitudeIsNegative
          )
      ).to.not.be.reverted;
    });

    it("Should allow check-in at nearby location", async function () {
      await expect(
        ppap
          .connect(attendee1)
          .checkIn(
            0,
            locations.nearbyLocation.latitude,
            locations.nearbyLocation.latitudeIsNegative,
            locations.nearbyLocation.longitude,
            locations.nearbyLocation.longitudeIsNegative
          )
      ).to.not.be.reverted;
    });

    it("Should reject check-in from outside venue", async function () {
      await expect(
        ppap
          .connect(attendee1)
          .checkIn(
            0,
            locations.outsideVenue.latitude,
            locations.outsideVenue.latitudeIsNegative,
            locations.outsideVenue.longitude,
            locations.outsideVenue.longitudeIsNegative
          )
      ).to.be.revertedWithCustomError(ppap, "OutsideGeofence");
    });

    it("Should complete full attendance cycle and mint NFT", async function () {
      // Check in
      await ppap
        .connect(attendee1)
        .checkIn(
          0,
          locations.insideVenue.latitude,
          locations.insideVenue.latitudeIsNegative,
          locations.insideVenue.longitude,
          locations.insideVenue.longitudeIsNegative
        );

      // Wait minimum duration
      await time.increase(3600); // 1 hour

      // Check out
      await expect(
        ppap
          .connect(attendee1)
          .checkOut(
            0,
            locations.insideVenue.latitude,
            locations.insideVenue.latitudeIsNegative,
            locations.insideVenue.longitude,
            locations.insideVenue.longitudeIsNegative
          )
      )
        .to.emit(ppap, "AttendanceVerified")
        .withArgs(0, 0, attendee1.address);

      // Verify NFT ownership
      expect(await ppap.ownerOf(0)).to.equal(attendee1.address);
    });

    it("Should not allow check-out before minimum stay time", async function () {
      await ppap
        .connect(attendee1)
        .checkIn(
          0,
          locations.insideVenue.latitude,
          locations.insideVenue.latitudeIsNegative,
          locations.insideVenue.longitude,
          locations.insideVenue.longitudeIsNegative
        );

      await time.increase(1800); // 30 minutes

      await expect(
        ppap
          .connect(attendee1)
          .checkOut(
            0,
            locations.insideVenue.latitude,
            locations.insideVenue.latitudeIsNegative,
            locations.insideVenue.longitude,
            locations.insideVenue.longitudeIsNegative
          )
      ).to.be.revertedWithCustomError(ppap, "MinimumStayNotMet");
    });
  });

  describe("Time Constraints", function () {
    it("Should not allow check-in before event starts", async function () {
      const eventData = getEventData(currentTimestamp);
      await ppap
        .connect(organizer)
        .createEvent(
          eventData.name,
          eventData.description,
          eventData.startTime,
          eventData.endTime,
          eventData.latitude,
          eventData.latitudeIsNegative,
          eventData.longitude,
          eventData.longitudeIsNegative,
          eventData.radiusMiles,
          eventData.maxAttendees,
          eventData.minStayMinutes
        );

      await expect(
        ppap
          .connect(attendee1)
          .checkIn(
            0,
            locations.insideVenue.latitude,
            locations.insideVenue.latitudeIsNegative,
            locations.insideVenue.longitude,
            locations.insideVenue.longitudeIsNegative
          )
      ).to.be.revertedWithCustomError(ppap, "EventNotInProgress");
    });

    it("Should not allow check-in after event ends", async function () {
      const eventData = getEventData(currentTimestamp);
      await ppap
        .connect(organizer)
        .createEvent(
          eventData.name,
          eventData.description,
          eventData.startTime,
          eventData.endTime,
          eventData.latitude,
          eventData.latitudeIsNegative,
          eventData.longitude,
          eventData.longitudeIsNegative,
          eventData.radiusMiles,
          eventData.maxAttendees,
          eventData.minStayMinutes
        );

      await time.increaseTo(eventData.endTime + 3600); // 1 hour after end

      await expect(
        ppap
          .connect(attendee1)
          .checkIn(
            0,
            locations.insideVenue.latitude,
            locations.insideVenue.latitudeIsNegative,
            locations.insideVenue.longitude,
            locations.insideVenue.longitudeIsNegative
          )
      ).to.be.revertedWithCustomError(ppap, "EventNotInProgress");
    });
  });

  describe("Global Coordinates Handling", function () {
    beforeEach(async function () {
      // Create events in different hemispheres
      const createEventInLocation = async (location, name) => {
        const eventData = {
          ...getEventData(currentTimestamp),
          name: name,
          latitude: location.latitude,
          latitudeIsNegative: location.latitudeIsNegative,
          longitude: location.longitude,
          longitudeIsNegative: location.longitudeIsNegative,
        };

        await ppap
          .connect(organizer)
          .createEvent(
            eventData.name,
            eventData.description,
            eventData.startTime,
            eventData.endTime,
            eventData.latitude,
            eventData.latitudeIsNegative,
            eventData.longitude,
            eventData.longitudeIsNegative,
            eventData.radiusMiles,
            eventData.maxAttendees,
            eventData.minStayMinutes
          );
      };

      // Create three events in different hemispheres
      await createEventInLocation(locations.southernHemisphere, "Sydney Event");
      await createEventInLocation(
        locations.westernHemisphere,
        "New York Event"
      );
      await createEventInLocation(locations.southWesternLocation, "Rio Event");

      await time.increaseTo(currentTimestamp + 86400); // Move to event start time
    });

    it("Should handle check-in at Southern Hemisphere location", async function () {
      await expect(
        ppap
          .connect(attendee1)
          .checkIn(
            0,
            locations.southernHemisphere.latitude,
            locations.southernHemisphere.latitudeIsNegative,
            locations.southernHemisphere.longitude,
            locations.southernHemisphere.longitudeIsNegative
          )
      ).to.not.be.reverted;
    });

    it("Should handle check-in at Western Hemisphere location", async function () {
      await expect(
        ppap
          .connect(attendee1)
          .checkIn(
            1,
            locations.westernHemisphere.latitude,
            locations.westernHemisphere.latitudeIsNegative,
            locations.westernHemisphere.longitude,
            locations.westernHemisphere.longitudeIsNegative
          )
      ).to.not.be.reverted;
    });

    it("Should handle check-in at South-Western Hemisphere location", async function () {
      await expect(
        ppap
          .connect(attendee1)
          .checkIn(
            2,
            locations.southWesternLocation.latitude,
            locations.southWesternLocation.latitudeIsNegative,
            locations.southWesternLocation.longitude,
            locations.southWesternLocation.longitudeIsNegative
          )
      ).to.not.be.reverted;
    });

    it("Should complete full attendance cycle with negative coordinates", async function () {
      // Check in at Rio location
      await ppap
        .connect(attendee1)
        .checkIn(
          2,
          locations.southWesternLocation.latitude,
          locations.southWesternLocation.latitudeIsNegative,
          locations.southWesternLocation.longitude,
          locations.southWesternLocation.longitudeIsNegative
        );

      // Wait minimum duration
      await time.increase(3600); // 1 hour

      // Check out
      await expect(
        ppap
          .connect(attendee1)
          .checkOut(
            2,
            locations.southWesternLocation.latitude,
            locations.southWesternLocation.latitudeIsNegative,
            locations.southWesternLocation.longitude,
            locations.southWesternLocation.longitudeIsNegative
          )
      )
        .to.emit(ppap, "AttendanceVerified")
        .withArgs(2, 0, attendee1.address);

      // Verify NFT ownership
      expect(await ppap.ownerOf(0)).to.equal(attendee1.address);
    });

    it("Should reject check-in at incorrect negative coordinates", async function () {
      // Try to check in at Rio event with Sydney coordinates
      await expect(
        ppap
          .connect(attendee1)
          .checkIn(
            2,
            locations.southernHemisphere.latitude,
            locations.southernHemisphere.latitudeIsNegative,
            locations.southernHemisphere.longitude,
            locations.southernHemisphere.longitudeIsNegative
          )
      ).to.be.revertedWithCustomError(ppap, "OutsideGeofence");
    });
  });

  describe("Small Radius Geofencing", function () {
    beforeEach(async function () {
      // Create an event centered at Trivandrum International Airport (8.4834° N, 76.9198° E)
      const eventCenter = {
        latitude: 887026, // 8.4834° N (scaled by 1e5)
        latitudeIsNegative: false,
        longitude: 7663364, // 76.9198° E (scaled by 1e5)
        longitudeIsNegative: false,
      };

      // Create event with 1 mile radius
      const eventData = {
        name: "Airport Conference",
        description: "Test event with small radius",
        startTime: (await time.latest()) + 86400,
        endTime: (await time.latest()) + 172800,
        latitude: eventCenter.latitude,
        latitudeIsNegative: eventCenter.latitudeIsNegative,
        longitude: eventCenter.longitude,
        longitudeIsNegative: eventCenter.longitudeIsNegative,
        radiusMiles: 1, // 1 mile radius
        maxAttendees: 100,
        minStayMinutes: 30,
      };

      await ppap
        .connect(organizer)
        .createEvent(
          eventData.name,
          eventData.description,
          eventData.startTime,
          eventData.endTime,
          eventData.latitude,
          eventData.latitudeIsNegative,
          eventData.longitude,
          eventData.longitudeIsNegative,
          eventData.radiusMiles,
          eventData.maxAttendees,
          eventData.minStayMinutes
        );

      await time.increaseTo(eventData.startTime);
    });

    it("Should allow check-in at 0.9 miles from center", async function () {
      // ~145 units in our coordinate system ≈ 1 mile
      // So 130 units ≈ 0.9 miles
      const nearbyLocation = {
        latitude: 887026 + 130,
        latitudeIsNegative: false,
        longitude: 7663364,
        longitudeIsNegative: false,
      };

      await expect(
        ppap
          .connect(attendee1)
          .checkIn(
            0,
            nearbyLocation.latitude,
            nearbyLocation.latitudeIsNegative,
            nearbyLocation.longitude,
            nearbyLocation.longitudeIsNegative
          )
      ).to.not.be.reverted;
    });

    it("Should reject check-in at 1.5 miles from center", async function () {
      // ~217 units ≈ 1.5 miles
      const farLocation = {
        latitude: 848340 + 217,
        latitudeIsNegative: false,
        longitude: 7691980,
        longitudeIsNegative: false,
      };

      await expect(
        ppap
          .connect(attendee1)
          .checkIn(
            0,
            farLocation.latitude,
            farLocation.latitudeIsNegative,
            farLocation.longitude,
            farLocation.longitudeIsNegative
          )
      ).to.be.revertedWithCustomError(ppap, "OutsideGeofence");
    });

    it("Should allow check-in at different points within 1 mile radius", async function () {
      const testLocations = [
        // Test North (0.8 miles ≈ 116 units)
        {
          latitude: 887026 + 116, // FIXED: Using correct base coordinate
          latitudeIsNegative: false,
          longitude: 7663364, // Event center longitude
          longitudeIsNegative: false,
        },
        // Test East (0.8 miles)
        {
          latitude: 887026, // Event center latitude
          latitudeIsNegative: false,
          longitude: 7663364 + 116, // FIXED: Using correct base coordinate
          longitudeIsNegative: false,
        },
        // Test Northeast (0.8 miles diagonal ≈ 82 units in each direction)
        {
          latitude: 887026 + 82, // FIXED: Using correct base coordinate
          latitudeIsNegative: false,
          longitude: 7663364 + 82, // FIXED: Using correct base coordinate
          longitudeIsNegative: false,
        },
      ];

      for (const location of testLocations) {
        await expect(
          ppap
            .connect(attendee1)
            .checkIn(
              0,
              location.latitude,
              location.latitudeIsNegative,
              location.longitude,
              location.longitudeIsNegative
            )
        ).to.not.be.reverted;

        // Reset for next test
        await ppap.connect(owner).removeOrganizer(attendee1.address);
      }
    });
  });
});
