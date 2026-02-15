import { GearApi } from "@gear-js/api";
import { Sails } from "sails-js";
import { SailsIdlParser } from "sails-js-parser";
import announcerIdl from "@/vara/announcer.idl?raw";
import registryIdl from "@/vara/registry.idl?raw";

const VARA_RPC = import.meta.env.VITE_VARA_RPC as string;
const REGISTRY_PROGRAM_ID = import.meta.env.VITE_VARA_REGISTRY_PROGRAM_ID as `0x${string}`;
const ANNOUNCER_PROGRAM_ID = import.meta.env.VITE_VARA_ANNOUNCER_PROGRAM_ID as `0x${string}`;

let apiInstance: GearApi | null = null;
let apiPromise: Promise<GearApi> | null = null;

let registrySails: Sails | null = null;
let registrySailsPromise: Promise<Sails> | null = null;

let announcerSails: Sails | null = null;
let announcerSailsPromise: Promise<Sails> | null = null;

export function connectVara(): Promise<GearApi> {
  if (apiInstance) return Promise.resolve(apiInstance);
  if (apiPromise) return apiPromise;

  apiPromise = GearApi.create({ providerAddress: VARA_RPC }).then((instance) => {
    apiInstance = instance;
    console.log("Connected to Vara");
    return instance;
  });

  return apiPromise;
}

export function getVaraApi(): GearApi | null {
  return apiInstance;
}

export function getRegistrySails(): Promise<Sails> {
  if (registrySails) return Promise.resolve(registrySails);
  if (registrySailsPromise) return registrySailsPromise;

  registrySailsPromise = (async () => {
    const api = await connectVara();
    const parser = await SailsIdlParser.new();
    const sails = new Sails(parser);
    sails.parseIdl(registryIdl);
    sails.setProgramId(REGISTRY_PROGRAM_ID);
    sails.setApi(api);
    registrySails = sails;
    console.log("Registry Sails initialized");
    return sails;
  })();

  return registrySailsPromise;
}

export function getAnnouncerSails(): Promise<Sails> {
  if (announcerSails) return Promise.resolve(announcerSails);
  if (announcerSailsPromise) return announcerSailsPromise;

  announcerSailsPromise = (async () => {
    const api = await connectVara();
    const parser = await SailsIdlParser.new();
    const sails = new Sails(parser);
    sails.parseIdl(announcerIdl);
    sails.setProgramId(ANNOUNCER_PROGRAM_ID);
    sails.setApi(api);
    announcerSails = sails;
    console.log("Announcer Sails initialized");
    return sails;
  })();

  return announcerSailsPromise;
}
