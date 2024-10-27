const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("Proof of Physical Attendance Protocol - REDACTED 2024", function () {
  let ppap;
  let owner;
  let organizer;
  let attendee1;
  let attendee2;
  let attendee3;
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
});
