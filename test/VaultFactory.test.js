const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VaultFactory", function () {
  let vaultFactory;
  let owner, feeRecipient, user;
  let bridgeContract, pythOracle;

  beforeEach(async function () {
    // Get signers
    [owner, feeRecipient, user, bridgeContract, pythOracle] = await ethers.getSigners();

    // Deploy VaultFactory
    const VaultFactory = await ethers.getContractFactory("VaultFactory");
    vaultFactory = await VaultFactory.deploy(
      feeRecipient.address,
      bridgeContract.address,
      pythOracle.address
    );
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await vaultFactory.owner()).to.equal(owner.address);
    });

    it("Should set the right fee recipient", async function () {
      expect(await vaultFactory.feeRecipient()).to.equal(feeRecipient.address);
    });

    it("Should set the right bridge contract", async function () {
      expect(await vaultFactory.bridgeContract()).to.equal(bridgeContract.address);
    });

    it("Should set the right pyth oracle", async function () {
      expect(await vaultFactory.pythOracle()).to.equal(pythOracle.address);
    });
  });

  describe("Vault creation", function () {
    it("Should compute a deterministic vault address", async function () {
      const vaultAddress = await vaultFactory.getVault(user.address);
      expect(ethers.isAddress(vaultAddress)).to.be.true;
    });
  });
});