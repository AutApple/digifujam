'use strict';

let gDigifujamVersion = 4;

Array.prototype.removeIf = function (callback) {
    var i = this.length;
    while (i--) {
        if (callback(this[i], i)) {
            this.splice(i, 1);
        }
    }
};

function array_move(arr, old_index, new_index) {
    if (new_index >= arr.length) {
        var k = new_index - arr.length + 1;
        while (k--) {
            arr.push(undefined);
        }
    }
    arr.splice(new_index, 0, arr.splice(old_index, 1)[0]);
    //return arr; // for testing
};

// https://stackoverflow.com/a/40407914/402169
function baseClamp(number, lower, upper) {
    if (number === number) {
        if (upper !== undefined) {
            number = number <= upper ? number : upper;
        }
        if (lower !== undefined) {
            number = number >= lower ? number : lower;
        }
    }
    return number;
}

let MidiNoteToFrequency = function (midiNote) {
    return 440 * Math.pow(2, (midiNote - 69) / 12);
};
let FrequencyToMidiNote = (hz) => {
    return 12.0 * Math.log2(Math.max(8, hz) / 440) + 69;
};

// linear mapping
let remap = function (value, low1, high1, low2, high2) {
    return low2 + (high2 - low2) * (value - low1) / (high1 - low1);
}

let remapWithPowCurve = (value, inpMin, inpMax, p, outpMin, outpMax) => {
    // map to 0-1
    value -= inpMin;
    value /= inpMax - inpMin;
    if (value < 0) value = 0;
    if (value > 1) value = 1;
    // curve
    value = Math.pow(value, p);
    // map to outpMin-outpMax
    value *= outpMax - outpMin;
    return value + outpMin;
};

// make sure IDDomain is set, this is needed to differentiate IDs generated on server versus client to make sure they don't collide.
let gNextID = 1;
let generateID = function () {
    console.assert(gIDDomain);
    let ret = gIDDomain + gNextID;
    gNextID++;
    return ret;
}

let gGlobalInstruments = [];

let SetGlobalInstrumentList = function (x) {
    gGlobalInstruments = x;
    console.log(`Global instrument closet now has ${x.length} instruments defined`);
}


const ClientMessages = {
    Identify: "Identify", // user info, and optional admin password
    InstrumentRequest: "InstrumentRequest", // instid
    InstrumentRelease: "InstrumentRelease",
    ChatMessage: "ChatMessage",// (to_userID_null, msg)
    Pong: "Pong", // token
    NoteOn: "NoteOn", // note, velocity
    NoteOff: "NoteOff", // note
    AllNotesOff: "AllNotesOff", // this is needed for example when you change MIDI device
    PedalDown: "PedalDown",
    PedalUp: "PedalUp",
    InstrumentParams: "InstParams",// {} object mapping paramID => newVal -- pitch bend is a special param called "pb"
    CreateParamMapping: "CreateParamMapping", // paramID, eParamMappingSource
    RemoveParamMapping: "RemoveParamMapping", // paramID

    InstrumentPresetDelete: "InstrumentPresetDelete", // presetID
    InstrumentPresetSave: "InstrumentPresetSave", // {params} just like InstParams, except will be saved. the "presetID" param specifies preset to overwrite.
    InstrumentBankReplace: "InstrumentBankReplace", // [{preset},{preset...}]
    InstrumentFactoryReset: "InstrumentFactoryReset",
    DownloadServerState: "DownloadServerState",
    UploadServerState: "UploadServerState",

    UserState: "UserState", // name, color, img, x, y
    Cheer: "Cheer", // text, x, y
};

const ServerMessages = {
    PleaseIdentify: "PleaseIdentify",
    PleaseReconnect: "PleaseReconnect",
    Welcome: "Welcome",// (your UserID & room state, and whether you are an admin)
    UserEnter: "UserEnter",// (user data), <oldRoomName>
    UserLeave: "UserLeave",// UserID, <newRoomName>
    UserChatMessage: "UserChatMessage",// (fromUserID, toUserID_null, msg)
    Ping: "Ping", // token, users: [{ userid, pingMS, roomID, stats }], rooms: [{roomID, roomName, userCount, stats}]
    InstrumentOwnership: "InstrumentOwnership",// [InstrumentID, UserID_nullabl, idle]
    NoteOn: "NoteOn", // user, note, velocity
    NoteOff: "NoteOff", // user, note
    UserAllNotesOff: "UserAllNotesOff", // this is needed for example when you change MIDI device
    PedalDown: "PedalDown", // user
    PedalUp: "PedalUp", // user
    InstrumentParams: "InstParams",// { userID, instrumentID, patchObj:{object mapping paramID to newVal} } ] -- pitch bend is a special param called "pb"
    CreateParamMapping: "CreateParamMapping", // instrumentID, paramID, eParamMappingSource
    RemoveParamMapping: "RemoveParamMapping", // instrumentID, paramID

    ServerStateDump: "ServerStateDump",

    InstrumentPresetDelete: "InstrumentPresetDelete", // instrumentID, presetID
    InstrumentPresetSave: "InstrumentPresetSave", // instrumentID, {params} just like InstParams, except will be saved. the "presetID" param specifies preset to overwrite. may be new.
    InstrumentBankReplace: "InstrumentBankReplace", // [{preset},{preset...}]
    InstrumentFactoryReset: "InstrumentFactoryReset", // instrumentID, [presets]

    UserState: "UserState", // user, name, color, img, x, y
    Cheer: "Cheer", // userID, text, x, y
};

const ServerSettings = {
    PingIntervalMS: 3000,
    ChatHistoryMaxMS: (1000 * 60 * 60),

    InstrumentIdleTimeoutMS: (1000 * 60),
    InstrumentAutoReleaseTimeoutMS: (1000 * 60 * 5),

    UsernameLengthMax: 20,
    UsernameLengthMin: 1,
    UserColorLengthMax: 100,
    UserColorLengthMin: 1,

    ChatMessageLengthMax: 288,

    WorldUserCountMaximum: 100,
};

const ClientSettings = {
    ChatHistoryMaxMS: (1000 * 60 * 60),
    MinCheerIntervalMS: 200,
    InstrumentParamIntervalMS: 50,
    InstrumentFloatParamDiscreteValues: 64000,
};

const eParamMappingSource = {
    Macro0: 1000,
    Macro1: 1001,
    Macro2: 1002,
    Macro3: 1003,
    CC1: 1,
    CC2: 2,
    CC3: 3,
    CC4: 4,
    CC5: 5,
    CC6: 6,
    CC7: 7,
    CC8: 8,
    CC9: 9,
    CC10: 10,
    CC11: 11,
};

const AccessLevels = {
    User: 0,
    Admin: 1,
};

class DigifuUser {
    constructor() {
        this.userID = null;
        this.pingMS = 0;
        this.lastActivity = null; // this allows us to display as idle or release instrument

        this.name = "";
        this.color = "";
        this.position = { x: 0, y: 0 }; // this is your TARGET position in the room/world. your position on screen will just be a client-side interpolation
        this.img = null;
        this.idle = null; // this gets set when a user's instrument ownership becomes idle

        this.stats = {
            noteOns: 0,
            cheers: 0,
            messages: 0,
        };
    }

    thaw() { /* no child objects to thaw. */ }
};

const InstrumentParamType = {
    intParam: "intParam",
    floatParam: "floatParam",
    textParam: "textParam",
    cbxParam: "cbxParam", // checkbox bool. you can also do enum-style params with intParam
    inlineLabel: "inlineLabel", // just a label, inline positioning
};

const InternalInstrumentParams = [
    {
        "paramID": "patchName",
        "name": "Patch name",
        "parameterType": "textParam",
        "supportsMapping": false,
        "isInternal": true,
        "maxTextLength": 100,
        "currentValue": "init",
        "defaultValue": "init"
    },
    {
        "paramID": "presetID",
        "name": "Preset ID",
        "parameterType": "textParam",
        "supportsMapping": false,
        "isInternal": true,
        "maxTextLength": 100
    },
    {
        "paramID": "author",
        "name": "Author",
        "parameterType": "textParam",
        "supportsMapping": false,
        "isInternal": true,
        "maxTextLength": 100
    },
    {
        "paramID": "savedDate",
        "name": "Saved date",
        "parameterType": "textParam",
        "supportsMapping": false,
        "isInternal": true,
        "maxTextLength": 100
    },
    {
        "paramID": "tags",
        "name": "Tags",
        "parameterType": "textParam",
        "supportsMapping": false,
        "isInternal": true,
        "maxTextLength": 500
    },
    {
        "paramID": "isReadOnly",
        "name": "Tags",
        "parameterType": "intParam",
        "supportsMapping": false,
        "isInternal": true,
    },
];



class InstrumentParam {
    constructor() {
        this.paramID = "";
        this.name = "";
        this.parameterType = InstrumentParamType.intParam;
        this.hidden = false;
        this.groupName = "Params";
        this.tags = ""; // any extra strings to match filter text
        this.cssClassName = "";
        this.minValue = 0;// inclusive
        this.maxValue = 0;// inclusive
        this.valueCurve = 1; // 1 = linear slider, higher values = more concave curve. 10 would be very extreme, 2 is usable
        this.zeroPoint = null;// 0-1 of output range, when scaling to external range, when neg & pos ranges are different, it's a bit fuzzy to know where "0" is on the output range. We calculate it and put it here.

        // stuff for mapping
        this.supportsMapping = true;
        this.mappingSrcVal = undefined;// eParamMappingSource
        this.isMappingRange = undefined;
        this.isMappingSrc = undefined;
        this.dependentParamID = undefined;// for mapping sources or ranges, this is the paramID of the affected/dependent param.

        this.isMidiCC = false;
        this.midiCC = undefined; // which midi CC does this represent
        this.isMacro = false;
        this.macroIdx = undefined; // which macro index does tihs represent?

        this.currentValue = 0; // the value with any mappings applied (MIDI CC, macro etc)
        this.rawValue = 0;// the value with no mappings applied, as advertised by the GUI sliders for example
    }
    thaw() { /* no child objects to thaw. */ }

    isParamForOscillator(i) {
        if (!this.paramID.startsWith("osc")) return false;
        if (parseInt(this.paramID[3]) != i) return false;
        return true;
    }

    getCurrespondingParamIDForOscillator(destOscIndex) {
        let ret = "osc" + destOscIndex + this.paramID.substring(4);
        return ret;
    }

    // returns true if a zero point exists.
    ensureZeroPoint() {
        let doesInpRangeCrossZero = (this.minValue < 0 && this.maxValue > 0);
        if (!doesInpRangeCrossZero) return false;
        if (this.zeroPoint != null) return true;
        this.zeroPoint = 0.5;
        return true;
    }

    // I KNOW THE CORRECT THING TO DO is to tailor each curve perfectly with a log scale to the specific ranges at hand.
    // HOWEVER using pow() i find it more flexible for tweaking the UI regardless of mathematical perfection,
    // --> and simpler to manage for my non-mathematical pea brain.

    nativeToForeignValue(v, outpMin, outpMax) {
        if (!this.ensureZeroPoint()) {
            // only 1 pole; simple mapping with curve.
            return remapWithPowCurve(v, this.minValue, this.maxValue, 1.0 / this.valueCurve, outpMin, outpMax);
        }
        // we know zero point is valid from here.

        let outpZero = this.zeroPoint * (outpMax - outpMin) + outpMin; // this is the output VALUE which represents inp of 0.
        if (v == 0) return outpZero; // eliminate div0 with a shortcut
        if (v > 0) {
            // positive
            return remapWithPowCurve(v, 0, this.maxValue, 1.0 / this.valueCurve, outpZero, outpMax);
        }
        return remapWithPowCurve(v, 0, this.minValue, 1.0 / this.valueCurve, outpZero, outpMin);
    }

    foreignToNativeValue(v, inpMin, inpMax) {
        if (!this.ensureZeroPoint()) {
            // only 1 pole; simple mapping with curve.
            return remapWithPowCurve(v, inpMin, inpMax, this.valueCurve, this.minValue, this.maxValue);
        }
        // we know zero point is valid from here.
        let inpZero = this.zeroPoint * (inpMax - inpMin) + inpMin; // foreign value represting native zero.
        if (v == inpZero) return 0;
        if (v > inpZero) {
            return remapWithPowCurve(v, inpZero, inpMax, this.valueCurve, 0, this.maxValue);
        }
        return remapWithPowCurve(v, inpZero, inpMin, this.valueCurve, 0, this.minValue);
    }

};

class DigifuInstrumentSpec {
    constructor() {
        this.name = "";
        this.sfinstrumentName = "";
        this.img = "";
        this.color = "rgb(138, 224, 153)";
        this.instrumentID = null;
        this.controlledByUserID = null;
        this.engine = null; // soundfont, minifm, drumkit
        this.activityDisplay = "none"; // keyboard, drums, none
        this.gain = 1.0;
        this.maxPolyphony = 8;
        this.params = [];// instrument parameter value map
        this.presets = []; // a preset is just a param:value pair
        this.namePrefix = "";// when forming names based on patch name, this is the prefix
        this.supportsPresets = true;
        this.maxTextLength = 100;
        this.behaviorAdjustmentsApplied = false; // upon thaw, based on teh behaviorstyle, we rearrange params and stuff. but once it's done, don't do it again (on the client)
        this.supportsObservation = false; // there's no point allowing certain instruments' params to be observed like drum kit or sampler

        this.paramMappings = [];
    }

    getDisplayName() {
        switch (this.engine) {
            case "soundfont":
                return this.name;
            case "drumkit":
                let kit = this.GetParamByID("kit");
                return this.namePrefix + " " + kit.enumNames[kit.currentValue];
            case "minifm":
                // fall through to calculate the name.
                break;
        }
        let pn = this.GetParamByID("patchName");
        if (!pn) return this.name;

        if (pn.currentValue && pn.currentValue.length > 0 && this.namePrefix && this.namePrefix.length > 0) {
            return this.namePrefix + pn.currentValue;
        }
        return this.name;
    }

    GetParamByID(paramID) {
        return this.params.find(p => p.paramID == paramID);
    }

    // tries hard to find a "default" or "safe" value (used for ctrl+click a param)
    GetDefaultValueForParam(param) {
        if (param.defaultValue) return param.defaultValue;
        let preset = this.GetInitPreset();
        if (preset[param.paramID]) return preset[param.paramID];
        return this.CalculateDefaultValue(param);
    }

    // like getdefaultvalueforparam, except does'nt consult any init preset.
    CalculateDefaultValue(param) {
        switch (param.paramID) {
            case "pb":
                return 0;
            case "patchName":
                return "init";
            case "presetID":
                return generateID();
        }
        if (param.defaultValue) return param.defaultValue;
        switch (param.parameterType) {
            case "textParam":
                return "";
        }
        if (param.minValue <= 0 && param.maxValue >= 0) return 0;
        return param.minValue;
    }

    // always return a valid preset.
    GetInitPreset() {
        let ret = this.presets.find(p => p.patchName == "init");
        if (ret) {
            //console.log(`loading init patch called 'init' for instrument ${this.name}`);
            return ret;
        }

        // if an INIT patch does not exist, then one is generated
        ret = {};
        this.params.forEach(param => {
            ret[param.paramID] = this.CalculateDefaultValue(param);
        });

        ret.patchName = "init";
        ret.presetID = generateID();
        ret.isReadOnly = true;
        this.presets.unshift(ret);

        return this.presets[0];
    }

    getParamMappingParamIDsForParam(param) {
        return {
            mappingSrc: "mappingSrc__" + param.paramID,
            mappingRange: "mappingRange__" + param.paramID
        };
    }

    // returns null if the param is not mapped.
    getParamMappingSpec(param) {
        // mappingSrc:osc0_level
        // mappingRange:osc0_level
        // midiCC_0
        let paramIDs = this.getParamMappingParamIDsForParam(param);

        let mappingSrc = this.GetParamByID(paramIDs.mappingSrc);
        if (!mappingSrc) return null;
        if (!mappingSrc.currentValue) {
            return null;
        }
        let mappingRange = this.GetParamByID(paramIDs.mappingRange);
        if (!mappingRange) {
            return null;
        }

        return {
            mappingSrc,
            mappingRange,
            param
        };
    }

    // returns {mappingSrc, mappingRange, param }
    ensureParamMappingParams(param, srcValue) {
        let paramIDs = this.getParamMappingParamIDsForParam(param);
        //console.log(`ensureParamMappingParams paramIDs: ${JSON.stringify(param)}`);
        let mappingSrc = this.GetParamByID(paramIDs.mappingSrc);
        if (!mappingSrc) {
            mappingSrc = Object.assign(new InstrumentParam(), {
                paramID: paramIDs.mappingSrc,
                name: "Source",
                parameterType: "intParam",
                defaultValue: 0,
                isInternal: true,
                hidden: true,
                isMappingSrc: true,
                dependentParamID: param.paramID,
                minValue: 0,
                supportsMapping: false,
                maxValue: 10000,
                currentValue: srcValue,
            });
            this.params.push(mappingSrc);
            console.log(`created mapping source param: ${mappingSrc.paramID}`);
        }
        let mappingRange = this.GetParamByID(paramIDs.mappingRange);
        if (!mappingRange) {
            mappingRange = Object.assign(new InstrumentParam(), {
                paramID: paramIDs.mappingRange,
                name: "Range",
                parameterType: "floatParam",
                defaultValue: 0,
                isInternal: true,
                hidden: true,
                isMappingRange: true,
                dependentParamID: param.paramID,
                supportsMapping: false,
                minValue: -1.0,
                maxValue: 1.0,
                currentValue: 0
            });
            console.log(`created mappingRange param: ${mappingRange.paramID}`);
            this.params.push(mappingRange);
        }
        return { mappingSrc, mappingRange, param };
    }

    createParamMappingFromMacro(param, macroIndex) {
        let params = this.ensureParamMappingParams(param, eParamMappingSource.Macro0 + macroIndex);
    }

    createParamMappingFromCC(param, cc) {
        let params = this.ensureParamMappingParams(param, cc);
    }

    // returns a patchObj which the caller should apply updates with, including on this instrument.
    removeParamMapping(param) {
        let paramIDs = this.getParamMappingParamIDsForParam(param);
        this.params.removeIf(p => p.paramID === paramIDs.mappingSrc || p.paramID === paramIDs.mappingRange);

        // - when you remove mapping, recalc is needed
        const patchObj = {};
        patchObj[param.paramID] = param.rawValue;
        return patchObj;
    }

    // spec is eParamMappingSource
    FindMapSrcValueParamForMappingSrc(srcType) {
        let mi = srcType - eParamMappingSource.Macro0;
        if (mi >= 0 && mi <= 3) {
            return this.params.find(p => p.macroIdx == mi);
        }
        return this.params.find(p => p.midiCC == srcType);
    }

    getMappingSrcDisplayName(mappingSpec) {
        let mi = mappingSpec.mappingSrc.currentValue - eParamMappingSource.Macro0;
        if (mi >= 0 && mi <= 3) {
            return "Macro " + mi;
        }
        return "MIDI CC#" + mappingSpec.mappingSrc.currentValue;
    }

    // return all mapping specs for the given mappingSrc.currentValue.
    // always valid, may be empty.
    getMappingSpecsForSrcVal(val) {
        let matchingSrcParams = this.params.filter(param => {
            if (!param.isMappingSrc) return false;
            if (param.currentValue != val) return false;
            return true;
        });
        return matchingSrcParams.map(mappingSrc => {
            // find matching param
            const paramID = mappingSrc.dependentParamID;
            const param = this.GetParamByID(paramID);
            const mappingRange = this.GetParamByID("mappingRange__" + param.paramID);
            return {
                mappingSrc,
                mappingRange,
                param
            };
        });
    }

    srcValueHasMappings(val) {
        return this.params.some(param => {
            if (!param.isMappingSrc) return false;
            if (param.currentValue != val) return false;
            return true;
        });
    }

    MIDICCHasMappings(cc) {
        return this.srcValueHasMappings(cc);
    }

    getMappingSpecsForMidiCC(cc) {
        return this.getMappingSpecsForSrcVal(cc);
    }

    getMappingSpecsForMacro(macroIdx) {
        return this.getMappingSpecsForSrcVal(eParamMappingSource.Macro0 + macroIdx);
    }

    // patchObj is a param/value map of RAW values.
    // here is where we apply mappings and calculate the currentValue.
    // mapping gives us a sort of dependency graph, and therefore it's important to process things in the correct order.
    //
    // this will PUSH mapping source values (like CC changes) to dependent params,
    // and also PULL for dependent params. so it's possible that values get calculated twice here. but since that scenario
    // only really happens during big patch changes, then don't bother optimizing it.
    //
    // RULE #1480: when a mapping range or source is being set here, it should also recalculate the dependent params.
    //
    // returns a map of paramID : currentValue (live calculated value) for use by synthesizer to update live params
    integrateRawParamChanges(patchObj) {
        if (!patchObj) return;

        const ret = {};

        const midiCCs = {};// map paramID to param
        const macros = {};// map paramID to param
        const otherMappableParams = {};// map paramID to param

        // apply RAW values to all given params (which also will set the new dependency topology)
        const keys = Object.keys(patchObj);
        keys.forEach(k => {
            let param = this.params.find(p => p.paramID === k);
            if (!param) {
                // is it a MIDI CC parameter? create it.
                const midiCC = parseInt(k.substring("midicc_".length));
                if (k.startsWith("midicc_")) {
                    param = Object.assign(new InstrumentParam(), {
                        paramID: k,
                        name: k,
                        parameterType: InstrumentParamType.intParam,
                        defaultValue: 0,
                        isInternal: true,
                        hidden: true,
                        isMidiCC: true,
                        midiCC: midiCC,
                        mappingSrcVal: midiCC,
                        minValue: 0,
                        maxValue: 127,
                    });
                    this.params.push(param);
                    console.log(`created a new midi cc parameter: ${k} for midi CC ${param.midiCC}`);
                } else {
                    console.log(`integrateRawParamChanges: "${k}" was not found, its value will be ignored.`);
                    return;
                }
            }
            param.rawValue = patchObj[k];

            // if this is a mapping src or mapping range, then the depenedent parameter needs to be recalculated.
            if (param.isMappingSrc || param.isMappingRange) {
                // find the dependent param obj.
                let dp = this.GetParamByID(param.dependentParamID);
                if (!dp) {
                    throw new Error(`Param is mapped, but the source param '${param.dependentParamID}' is not found??`);
                }
                if (dp.isMacro) {
                    macros[dp.paramID] = dp;
                } else {
                    otherMappableParams[dp.paramID] = dp;
                }
            }

            if (param.isMidiCC) midiCCs[param.paramID] = param;
            if (param.isMacro) macros[param.paramID] = param;

            if (param.supportsMapping) {
                otherMappableParams[param.paramID] = param;
            } else {
                param.currentValue = this.calculateParamCurrentValue(param, null, null);
                ret[k] = param.currentValue;
            }
        });

        // graph topology is set

        // PUSH CC changes to dependent params. And when the dependent param is a macro, then add to macros[] to be pushed to its dependents.
        Object.keys(midiCCs).forEach(k => {
            const param = midiCCs[k];
            // find all params depending on this midi CC param directly, and calculate their currentValue.
            const specs = this.getMappingSpecsForSrcVal(param.mappingSrcVal); // { mappingSrc, mappingRange, param }
            specs.forEach(spec => {
                spec.param.currentValue = this.calculateParamCurrentValue(spec.param, spec, param);
                ret[spec.param.paramID] = spec.param.currentValue;
                // if it's a macro, then add it to macros
                if (spec.param.isMacro) {
                    macros.push(spec.param);
                }
            });
        });

        let calcOwnParamVal = (param) => {
            const spec = this.getParamMappingSpec(param);
            if (spec) {
                param.currentValue = this.calculateParamCurrentValue(param, spec, this.FindMapSrcValueParamForMappingSrc(spec.mappingSrc.currentValue));
            } else {
                param.currentValue = this.calculateParamCurrentValue(param, null, null);
            }
            ret[param.paramID] = param.currentValue;
        };

        // calculate macro values
        const macroKeys = Object.keys(macros);
        macroKeys.forEach(k => {
            calcOwnParamVal(macros[k]);
        });

        // PUSH MACRO changes.
        macroKeys.forEach(k => {
            const param = macros[k];
            // find all params depending on this macro directly, and calculate them.
            const specs = this.getMappingSpecsForSrcVal(param.mappingSrcVal); // { mappingSrc, mappingRange, param }
            specs.forEach(spec => {
                spec.param.currentValue = this.calculateParamCurrentValue(spec.param, spec, param);
                ret[spec.param.paramID] = spec.param.currentValue;
            });
        });

        // PULL changes for mapped params.
        Object.keys(otherMappableParams).forEach(k => {
            calcOwnParamVal(otherMappableParams[k]);
        });

        return ret;
    }

    // returns the value; doesn't set it. caller can do that.
    // mappingSpec is { mappingSrc, mappingRange, param }
    // mappingSrcValueParam should be NULL if mappingSpec is null, or it should be a midiCC or macro parameter which corresponds to the mapping
    calculateParamCurrentValue(param, mappingSpec, mappingSrcValueParam) {
        if (!mappingSpec || !mappingSrcValueParam) {
            const ret = this.sanitizeInstrumentParamVal(param, param.rawValue);
            // if (!gIsServer) {
            //     console.log(`calculateParamCurrentValue: param ${param.paramID} raw:${param.rawValue} live:${ret} <no mapping>`);
            // }
            return ret;
        }
        // all mappingSrc values are 0-127 to imitate midi CC.
        // and when CC is 0, we use the raw value.
        // when CC is max, use the value at maximum range. what is that range?
        const extent = mappingSpec.mappingRange.currentValue * (param.maxValue - param.minValue);
        //const mappingSrcValueParam = mappingSpec.mappingSrc.currentValue;
        const mappedVal = remap(mappingSrcValueParam.currentValue, 0, 127, param.rawValue, param.rawValue + extent);
        const ret = this.sanitizeInstrumentParamVal(param, mappedVal);
        // if (!gIsServer) {
        //     console.log(`calculateParamCurrentValue: param ${param.paramID} raw:${param.rawValue} live:${ret} <mapping to ${mappingSrcValueParam.name} with ${mappingSrcValueParam.currentValue}>`);
        // }
        return ret;
    }

    exportAllPresetsJSON() {
        return JSON.stringify(this.presets.filter(p => p.patchName != "init"));
    }

    // return true/false success
    importAllPresetsArray(a) {
        if (!Array.isArray(a)) {
            console.log(`importing presets array but 'a' is not an array; it's a ${typeof (a)}`);
            return false;
        }
        // TODO: other validation.
        // do a cursory check of all require params existing.
        const requiredParamKeys = ["presetID", "patchName"];
        let pass = true;
        a.forEach(p => {
            // does p contain ALL paramIDs in 
            let count = 0;
            requiredParamKeys.forEach(requiredKey => {
                if (Object.keys(p).some(k => k == requiredKey)) {
                    count++;
                }
            });
            if (count < requiredParamKeys.length) {
                console.log(`Trying to import a preset with too few required params (${count} < ${requiredParamKeys.length})`);
                pass = false;
                return;
            }
        });
        if (!pass) {
            console.log(`=> Can't import presets.`);
            return false;
        }
        // import everything except init, and add our own init.
        let init = this.GetInitPreset();
        this.presets = a.filter(p => p.patchName != "init");
        this.presets.unshift(init);
        return true;
    }

    // return true/false success
    importAllPresetsJSON(js) {
        try {
            this.importAllPresetsArray(JSON.parse(js));
            return true;
        } catch (e) {
            return false;
        }
    }

    // exports LIVE params as a patch
    exportPatchObj() {
        let ret = {};
        this.params.forEach(param => {
            if (param.paramID == "pb") { return; } // pitch bend is not something we want to store in presets
            if (param.isMidiCC) { return; } // also not helpful to store CC values which are live.
            ret[param.paramID] = param.rawValue;
        });
        return ret;
    }

    ReleaseOwnership() {
        this.controlledByUserID = null;
        // - set pb and all CC values to 0 when instrument release/take
        this.params.removeIf(p => {
            if (p.midiCC) return true;
            return false;
        });
        const pb = this.GetParamByID("pb");
        pb.currentValue = 0;
        pb.rawValue = 0;
    }

    thaw() {
        this.params = this.params.map(o => {
            let n = Object.assign(new InstrumentParam(), o);
            n.thaw();
            return n;
        });

        if (this.behaviorAdjustmentsApplied) return;

        // for restrictive behaviorStyles, we force params to a certain value and hide from gui always.
        this.paramsToForceAndHide = {};

        if (this.engine === "minifm" && this.behaviorStyle === "microSub") {
            this.paramsToForceAndHide = {
                enable_osc0: true,
                enable_osc1: true,
                enable_osc2: true,
                enable_osc3: false,
                //voicing: 1,
                linkosc: 3, // A&B&C linked together
                algo: 7, // independent
                label_enableOsc: false, // don't show that label
                osc0_env1PanAmt: 0, // for reduced controls, i have to say this is really at the bottom of the list.
                osc0_freq_mult: 1.0,
                osc1_freq_mult: 1.0,
                osc2_freq_mult: 1.0,
                osc3_freq_mult: 1.0,
                osc0_freq_abs: 0,
                osc1_freq_abs: 0,
                osc2_freq_abs: 0,
                osc3_freq_abs: 0,
                osc0_level: 0.5, // there's not much reason to change oscillator gain when they're all in sync
                osc1_level: 0.5,
                osc2_level: 0.5,
                osc3_level: 0.5,
                osc0_freq_transp: 0,
                osc1_freq_transp: 0,
                osc2_freq_transp: 0,
                osc3_freq_transp: 0,
                osc0_lfo1_gainAmt: 0,// because gain is always 1, it makes the LFO control sorta hard to understand and limited.
                osc0_lfo2_gainAmt: 0,// because gain is always 1, it makes the LFO control sorta hard to understand and limited. it's not especially useful anyway.
                osc0_env_trigMode: 1,
                osc1_env_trigMode: 1,
                osc2_env_trigMode: 1,
                osc3_env_trigMode: 1,
                env1_trigMode: 1,
            };
            // and make modifications to certain params:

            // rearrange some things
            let moveToParam = (paramIDToMove, paramIDToShift) => {
                array_move(this.params, this.params.findIndex(p => p.paramID == paramIDToMove), this.params.findIndex(p => p.paramID === paramIDToShift));
            };
            let moveToAfterParam = (paramIDToMove, paramIDToShift) => {
                array_move(this.params, this.params.findIndex(p => p.paramID == paramIDToMove), 1 + this.params.findIndex(p => p.paramID === paramIDToShift));
            };

            moveToParam("detuneBase", "osc0_lfo1_pitchDepth");
            moveToAfterParam("detuneLFO1", "detuneBase");
            moveToAfterParam("detuneLFO2", "detuneBase");
            moveToAfterParam("pan_spread", "osc0_pan");

            moveToAfterParam("osc0_vel_scale", "osc0_r");
            moveToAfterParam("osc0_key_scale", "osc0_r");

            this.GetParamByID("osc0_vel_scale").cssClassName = "modAmtParam";
            this.GetParamByID("osc0_key_scale").cssClassName = "modAmtParam";

            this.GetParamByID("osc0_lfo1_gainAmt").name = "Gain LFO1";
            this.GetParamByID("osc0_lfo2_gainAmt").name = "Gain LFO2";

            this.GetParamByID("osc0_lfo1_pitchDepth").name = "Pitch LFO1";
            this.GetParamByID("osc0_lfo2_pitchDepth").name = "Pitch LFO2";
            this.GetParamByID("osc0_env1_pitchDepth").name = "Pitch ENV";

            this.GetParamByID("osc0_lfo1PanAmt").name = "Pan LFO1";
            this.GetParamByID("osc0_lfo2PanAmt").name = "Pan LFO2";
            this.GetParamByID("osc0_env1PanAmt").name = "Pan ENV";

            this.GetParamByID("detuneBase").cssClassName = "paramSpacer";
            this.GetParamByID("detuneBase").groupName = "∿ Osc A";
            this.GetParamByID("detuneBase").name = "Detune semis";
            this.GetParamByID("detuneLFO1").groupName = "∿ Osc A";
            this.GetParamByID("detuneLFO2").groupName = "∿ Osc A";
            this.GetParamByID("detuneLFO1").name = "Detune LFO1";
            this.GetParamByID("detuneLFO2").name = "Detune LFO2";

            this.GetParamByID("osc0_a").cssClassName = "paramSpacer";
            this.GetParamByID("pan_spread").groupName = "∿ Osc A";
            this.GetParamByID("pan_spread").name = "Separation";

            this.behaviorAdjustmentsApplied = true;
        }
    }

    GetDefaultShownGroupsForInstrument() {
        if (this.engine === "minifm" && this.behaviorStyle === "microSub") {
            return ["master", "∿ Osc A"];
        }
        return ["master"];
    }


    getPatchObjectToCopyOscillatorParams(srcOscIndex, destOscIndex) {
        console.assert(this.engine == "minifm");
        let srcParams = this.params.filter(param => param.isParamForOscillator(srcOscIndex));
        // construct a patch object.
        let patch = {};
        srcParams.forEach(srcParam => {
            let destParamID = srcParam.getCurrespondingParamIDForOscillator(destOscIndex);
            patch[destParamID] = srcParam.rawValue;
        });
        return patch;
    }

    getOscLinkingSpec() {
        const par = this.GetParamByID("linkosc");
        if (!par) {
            return null;
        }
        const spec = this.GetParamByID("linkosc").currentValue;

        // 0 "◯◯◯◯",
        // 1 "🔵🔵◯◯",
        // 2 "🔵◯🔵◯",
        // 3 "🔵🔵🔵◯",
        // 4 "🔵◯◯🔵",
        // 5 "🔵🔵◯🔵",
        // 6 "🔵◯🔵🔵",
        // 7 "🔵🔵🔵🔵",
        // 8 "🔵🔵🔴🔴",
        // 9 "🔵🔴🔵🔴",
        // 10 "🔵🔴🔴🔵",
        // 11 "◯🔵🔵◯",
        // 12 "◯🔵◯🔵",
        // 13 "◯◯🔵🔵"
        switch (spec) {

            case 0: // 0 "◯◯◯◯",
                return { sources: [0, 1, 2, 3], groupNames: ["∿ Osc A", "∿ Osc B", "∿ Osc C", "∿ Osc D"], oscParamUsed: [true, true, true, true] };
            case 1: // 1 "🔵🔵◯◯",
                return { sources: [0, 0, 2, 3], groupNames: ["∿ Osc A & B", "(n/a)", "∿ Osc C", "∿ Osc D"], oscParamUsed: [true, false, true, true] };
            case 2: // 2 "🔵◯🔵◯",
                return { sources: [0, 1, 0, 3], groupNames: ["∿ Osc A & C", "∿ Osc B", "(n/a)", "∿ Osc D"], oscParamUsed: [true, true, false, true] };
            case 3: // 3 "🔵🔵🔵◯",
                return { sources: [0, 0, 0, 3], groupNames: ["∿ Osc A & B & C", "(n/a)", "(n/a)", "∿ Osc D"], oscParamUsed: [true, false, false, true] };
            case 4: // 4 "🔵◯◯🔵",
                return { sources: [0, 1, 2, 0], groupNames: ["∿ Osc A & D", "∿ Osc B", "∿ Osc C", "(n/a)"], oscParamUsed: [true, true, true, false] };
            case 5: // 5 "🔵🔵◯🔵",
                return { sources: [0, 0, 2, 0], groupNames: ["∿ Osc A & B & D", "(n/a)", "∿ Osc C", "(n/a)"], oscParamUsed: [true, false, true, false] };
            case 6: // 6 "🔵◯🔵🔵",
                return { sources: [0, 1, 0, 0], groupNames: ["∿ Osc A & C & D", "∿ Osc B", "(n/a)", "(n/a)"], oscParamUsed: [true, true, false, false] };
            case 7: // 7 "🔵🔵🔵🔵",
                return { sources: [0, 0, 0, 0], groupNames: ["∿ Osc A & B & C & D", "(n/a)", "(n/a)", "(n/a)"], oscParamUsed: [true, false, false, false] };
            case 8: // 8 "🔵🔵🔴🔴",
                return { sources: [0, 0, 2, 2], groupNames: ["∿ Osc A & B", "(n/a)", "∿ Osc C & D", "(n/a)"], oscParamUsed: [true, false, true, false] };
            case 9: // 9 "🔵🔴🔵🔴",
                return { sources: [0, 1, 0, 1], groupNames: ["∿ Osc A & C", "∿ Osc B & D", "(n/a)", "(n/a)"], oscParamUsed: [true, true, false, false] };
            case 10: // 10 "🔵🔴🔴🔵",
                return { sources: [0, 1, 1, 0], groupNames: ["∿ Osc A & D", "∿ Osc B & C", "(n/a)", "(n/a)"], oscParamUsed: [true, true, false, false] };
            case 11: // 11 "◯🔵🔵◯",
                return { sources: [0, 1, 1, 3], groupNames: ["∿ Osc A", "∿ Osc B & C", "(n/a)", "∿ Osc D"], oscParamUsed: [true, true, false, true] };
            case 12: // 12 "◯🔵◯🔵",
                return { sources: [0, 1, 2, 1], groupNames: ["∿ Osc A", "∿ Osc B & D", "∿ Osc C", "(n/a)"], oscParamUsed: [true, true, true, false] };
            case 13: // 13 "◯◯🔵🔵"
                return { sources: [0, 1, 2, 2], groupNames: ["∿ Osc A", "∿ Osc B", "∿ Osc C & D", "(n/a)"], oscParamUsed: [true, true, true, false] };
        }

        console.error(`unknown oscillator linking spec ${spec}`);

    }


    // return { cssClassName, annotation, shown, displayName }
    getGroupInfo(groupName) {
        let ret = { cssClassName: "", annotation: "", displayName: groupName, shown: true, internalName: groupName };
        switch (this.engine) {
            case "soundfont":
                return ret;
            case "minifm":
                // fall through to calculate the name.
                break;
        }
        let isModulation = groupName.toLowerCase().startsWith("mod ");
        if (isModulation) {
            ret.cssClassName = "modulation";
        } else {
            const oscLinkSpec = this.getOscLinkingSpec();
            let oscGroupControlsAllowed = !(this.engine === "minifm" && this.behaviorStyle === "microSub");
            switch (groupName) {
                case "Filter":
                    const filtIsEnabled = !!this.GetParamByID("filterType").currentValue;
                    ret.annotation = filtIsEnabled ? "(On)" : "(Off)";
                    ret.cssClassName = filtIsEnabled ? "" : "disabled";
                    break;
                case "∿ Osc A":
                    ret.shown = oscLinkSpec.oscParamUsed[0];
                    ret.displayName = oscLinkSpec.groupNames[0];
                    ret.groupControls = oscGroupControlsAllowed ? "osc" : null;
                    ret.oscillatorSource = 0;
                    ret.oscillatorDestinations = [1, 2, 3];
                    break;
                case "∿ Osc B":
                    ret.shown = oscLinkSpec.oscParamUsed[1];
                    ret.displayName = oscLinkSpec.groupNames[1];
                    ret.groupControls = oscGroupControlsAllowed ? "osc" : null;
                    ret.oscillatorSource = 1;
                    ret.oscillatorDestinations = [0, 2, 3];
                    break;
                case "∿ Osc C":
                    ret.shown = oscLinkSpec.oscParamUsed[2];
                    ret.displayName = oscLinkSpec.groupNames[2];
                    ret.groupControls = oscGroupControlsAllowed ? "osc" : null;
                    ret.oscillatorSource = 2;
                    ret.oscillatorDestinations = [0, 1, 3];
                    break;
                case "∿ Osc D":
                    ret.shown = oscLinkSpec.oscParamUsed[3];
                    ret.displayName = oscLinkSpec.groupNames[3];
                    ret.groupControls = oscGroupControlsAllowed ? "osc" : null;
                    ret.oscillatorSource = 3;
                    ret.oscillatorDestinations = [0, 1, 2];
                    break;
            }
        }

        return ret;
    }

    // returns {
    //   oscGroups, // an array of oscillator groups which are enabled, and according to the algorithm specified.
    //   oscEnabled: [,,,]
    // }
    GetFMAlgoSpec() {
        let osc0_enabled = !!this.GetParamByID("enable_osc0").currentValue;
        let osc1_enabled = !!this.GetParamByID("enable_osc1").currentValue;
        let osc2_enabled = !!this.GetParamByID("enable_osc2").currentValue;
        let osc3_enabled = !!this.GetParamByID("enable_osc3").currentValue;
        let oscEnabled = [osc0_enabled, osc1_enabled, osc2_enabled, osc3_enabled];
        //console.log(`GetFMAlgoSpec esc enabled?`);
        //console.log(osc_enabled);
        let algo = this.GetParamByID("algo").currentValue;

        // "[1🡄2🡄3🡄4]",
        // "[1🡄2🡄3][4]",
        // "[1🡄(2+3)][4]",
        // "[1🡄(2+3+4)]",
        // "[1🡄2🡄(3+4)]",
        // "[1🡄2][3🡄4]",
        // "[1🡄2][3][4]",
        // "[1][2][3][4]",

        let oscGroups = [
            [[0, 1, 2, 3]], // 0
            [[0, 1, 2], [3]], // 1
            [[0, 1, 2], [3]], // 5
            [[0, 1, 2, 3]], // 6
            [[0, 1, 2, 3]], // 7
            [[0, 1], [2, 3]], // 2
            [[0, 1], [2], [3]], // 3
            [[0], [1], [2], [3]], // 4
        ];

        oscGroups = oscGroups[algo];
        // now remove oscillators not in use.
        oscGroups = oscGroups.filter(grp => {
            return grp.some(osc => oscEnabled[osc]); // at least 1 oscillator in the group is enabled? then keep it.
        });
        return {
            oscGroups,
            oscEnabled,
        };
    }

    // filters the list of presets to include only ones which are useful.
    // for example if OSC B is disabled, don't show any settings from OSC B.
    GetDisplayablePresetList(filterTxt) {
        if (this.engine != "minifm") {
            let ret = this.params.filter(p => {
                // internal params which aren't part of the normal param editing zone.
                if (p.paramID === "presetID") return false;
                if (p.paramID === "isReadOnly") return false;
                if (p.paramID === "author") return false;
                if (p.paramID === "savedDate") return false;
                if (p.paramID === "tags") return false;
                if (p.paramID === "patchName") return false;

                if (p.groupName.toLowerCase().includes(filterTxt)) return true;
                if (p.name.toLowerCase().includes(filterTxt)) return true;
                if (p.tags.toLowerCase().includes(filterTxt)) return true;

                return false;
            });
            return ret;
        }

        // but do show oscillators even if they're disabled, but any other oscillators are linked to it.
        // so if osc A is disabled, but A & B are linked, then show A.
        const oscLinkSpec = this.getOscLinkingSpec();
        const algoSpec = this.GetFMAlgoSpec();
        let oscEnabled = [false, false, false, false];

        for (let i = 0; i < algoSpec.oscEnabled.length; ++i) {
            if (algoSpec.oscEnabled[i]) {
                oscEnabled[i] = true;
                continue; // if it's explicitly enabled, fine.
            }
            oscEnabled[i] = oscLinkSpec.sources.some((linkMasterOscIndex, dependentOscIndex) => {
                // if this oscillator is disabled by checkbox, it should still be shown if
                // it's the target oscillator for any enabled oscillators.
                if (dependentOscIndex == i) return false; // doesn't count.
                if (linkMasterOscIndex != i) return false; // target is not this oscillator, not relevant.
                return algoSpec.oscEnabled[dependentOscIndex];
            });
        }

        let oscIsPWM = [
            this.GetParamByID("osc0_wave").currentValue == 4,
            this.GetParamByID("osc1_wave").currentValue == 4,
            this.GetParamByID("osc2_wave").currentValue == 4,
            this.GetParamByID("osc3_wave").currentValue == 4,
        ];

        let isPoly = this.GetParamByID("voicing").currentValue == 1;

        let forcedKeysToHide = Object.keys(this.paramsToForceAndHide);

        let ret = this.params.filter(p => {
            if (p.isInternal) return false;// internal params which aren't part of the normal param editing GUI.
            if (forcedKeysToHide.some(k => k == p.paramID)) return false;

            if (isPoly) {
                if (p.paramID === "env1_trigMode") return false;
                if (p.paramID.endsWith("_env1_trigMode")) return false;
                if (p.paramID.endsWith("_portamento")) return false;
                if (p.paramID.endsWith("_env_trigMode")) return false;
            }

            if (p.groupName === "∿ Osc A" && !oscEnabled[0]) return false;
            if (p.groupName === "∿ Osc B" && !oscEnabled[1]) return false;
            if (p.groupName === "∿ Osc C" && !oscEnabled[2]) return false;
            if (p.groupName === "∿ Osc D" && !oscEnabled[3]) return false;

            // detune is not relevant for a single osc or osc group.
            if (algoSpec.oscGroups.length < 2 && p.groupName === "Detune") return false;
            if (algoSpec.oscGroups.length < 2 && p.paramID === "pan_spread") return false; // same for other "variation" style params

            //duty cycle is pretty intrusive if you're not using PWM
            if (p.paramID.startsWith("osc0_pwm")) return oscIsPWM[0];
            if (p.paramID.startsWith("osc1_pwm")) return oscIsPWM[1];
            if (p.paramID.startsWith("osc2_pwm")) return oscIsPWM[2];
            if (p.paramID.startsWith("osc3_pwm")) return oscIsPWM[3];

            if (p.groupName.toLowerCase().includes(filterTxt)) return true;
            if (p.name.toLowerCase().includes(filterTxt)) return true;
            if (p.tags.toLowerCase().includes(filterTxt)) return true;

            return false;
        });
        return ret;
    }

    sanitizeInstrumentParamVal(param, newVal) {
        if (Object.keys(this.paramsToForceAndHide).some(k => k == param.paramID)) {
            return this.paramsToForceAndHide[param.paramID];
        }

        if (param.parameterType == InstrumentParamType.textParam) {
            if (typeof (newVal) != 'string') return "";
            let ret = newVal.trim();
            return ret.substring(0, param.maxTextLength);
        }
        if (param.parameterType == InstrumentParamType.cbxParam) {
            return !!newVal;
        }
        // numeric types...
        // just clamp to the range.
        if (newVal < param.minValue) return param.minValue;
        if (newVal > param.maxValue) return param.maxValue;
        return newVal;
    };

}; // InstrumentSpec

const ChatMessageType = {
    chat: "chat",
    nick: "nick",
    part: "part",
    join: "join",
    changeInstrument: "changeInstrument", // change
    aggregate: "aggregate",
};

class DigifuChatMessage {
    constructor() {
        this.messageID = null;
        this.timestampUTC = null;
        this.messageType = null; // of ChatMessageType. if aggregate then expect the below properties

        //this.aggregateMessages = []; // list of DigifuChatMessages
        //this.messages = [];// - the latest version of messages for the above events

        this.message = null;

        this.fromUserID = null;
        this.fromUserColor = null; // required because we keep a chat history, so when a user is removed from the list this data would no longer be available. now a client has fallback fields.
        this.fromUserName = null;

        this.toUserID = null;
        this.toUserColor = null;
        this.toUserName = null;

        this.fromRoomName = null;
        this.toRoomName = null;
    }

    thaw() { /* no child objects to thaw. */ }

    // aggregate integration
    integrate(rhs) {
        console.assert(this.messageType == ChatMessageType.aggregate);
        this.aggregateMessages.push(rhs);
        this.rebuildAggregateMessages();
    };

    toAggregate() {
        let ret = new DigifuChatMessage();
        ret.messageID = generateID();
        ret.messageType = ChatMessageType.aggregate;
        ret.aggregateMessages = [this];
        ret.timestampUTC = this.timestampUTC;
        ret.rebuildAggregateMessages();
        return ret;
    }

    isAggregatable() {
        if (this.messageType == ChatMessageType.part) return true;
        if (this.messageType == ChatMessageType.join) return true;
        return false;
    }

    rebuildAggregateMessages() {
        console.assert(this.messageType == ChatMessageType.aggregate);
        // we need to actually group things by user, so multiple events from the same user get collapsed.
        let joins = {}; // maps userid to { name, color }
        let parts = {}; // maps userid to { name, color }
        this.aggregateMessages.forEach(msg => {
            switch (msg.messageType) {
                case ChatMessageType.join:
                    joins[msg.fromUserName] = { name: msg.fromUserName, color: msg.fromUserColor }; // TODO: a real user id to group by.
                    break;
                case ChatMessageType.part:
                    parts[msg.fromUserName] = { name: msg.fromUserName, color: msg.fromUserColor }; // TODO: a real user id to group by.
                    break;
                default:
                    console.assert(false, "non-aggregatable msg found in an aggregate message...");
                    break;
            }
        });

        this.messages = [];

        // todo: group by userID not name, but it depends on having consistent userIDs across joins/parts which for the moment is not happening.
        let msgText = [];
        if (Object.keys(joins).length > 0) msgText.push(`Joined: ${Object.keys(joins).map(k => joins[k].name).join(', ')}`);
        if (Object.keys(parts).length > 0) msgText.push(`Left: ${Object.keys(parts).map(k => parts[k].name).join(', ')}`);
        if (msgText.length) {
            this.messages.push(msgText.join(", "));
        }
    }
};

class DFRect {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.w = 0;
        this.h = 0;
    }
    thaw() { }

    PointIntersects(pt) {
        if (pt.x < this.x) return false;
        if (pt.y < this.y) return false;
        if (pt.x >= this.x + this.w) return false;
        if (pt.y >= this.y + this.h) return false;
        return true;
    }
};

const RoomFns = {
    roomChange: "roomChange",
    toggleSign: "toggleSign",
};
const DFRoomItemType = {
    door: "door",
    sign: "sign",
    audioVisualization: "audioVisualization",
};

// a function that can be invoked by room items.
class RoomFn {
    constructor() {
        this.fn = null; // of RoomFns
        this.params = null; // anything.
    }
    thaw() { }
};

class RoomItem {
    constructor() {
        this.name = "";
        this.rect = null; // x, y, w, h
        this.itemType = null; // DFRoomItemType
        this.style = null; // CSS
        this.interactions = {};
        this.params = {};
    }
    thaw() {
        Object.keys(this.interactions).forEach(k => {
            this.interactions[k] = Object.assign(new RoomFn(), this.interactions[k]);
            this.interactions[k].thaw();
        });
        if (this.rect) {
            this.rect = Object.assign(new DFRect(), this.rect);
            this.rect.thaw();
        }
    }
};

class DigifuRoomState {
    constructor() {
        this.instrumentCloset = []; // list of DigifuInstrument instances
        this.users = [];
        this.chatLog = []; // ordered by time asc
        this.roomItems = [];
        this.internalMasterGain = 1.0;
        this.img = null;
        this.width = 16;
        this.height = 9;
        this.roomTitle = "";
        this.softwareVersion = gDigifujamVersion;

        this.stats = {
            noteOns: 0,
            cheers: 0,
            messages: 0,
        };
    }

    // call after Object.assign() to this object, to handle child objects.
    thaw() {
        this.instrumentCloset = this.instrumentCloset.map(o => {
            let n = Object.assign(new DigifuInstrumentSpec(), o);
            n.thaw();
            return n;
        });
        this.chatLog = this.chatLog.map(o => {
            let n = Object.assign(new DigifuChatMessage(), o);
            n.thaw();
            return n;
        });
        this.users = this.users.map(o => {
            let n = Object.assign(new DigifuUser(), o);
            n.thaw();
            return n;
        });
        this.roomItems = this.roomItems.map(o => {
            let n = Object.assign(new RoomItem(), o);
            n.thaw();
            return n;
        });
    }

    adminExportRoomState() {
        return {
            instrumentPresets: this.instrumentCloset.map(i => { return { instrumentID: i.instrumentID, presets: i.presets.filter(p => p.patchName != "init") } }),
            chatLog: this.chatLog,
            stats: this.stats,
        };
    }

    adminImportRoomState(data) {
        // don't import all instrument DEFINITIONS. just the presets.
        data.instrumentPresets.forEach(ip => {
            const f = this.FindInstrumentById(ip.instrumentID);
            if (!f) {
                console.log(`instrument ${ip.instrumentID} was not found; couldn't import its presets. Make sure instruments all have constant IDs set.`);
                return;
            }
            f.instrument.importAllPresetsArray(ip.presets);
        });

        this.chatLog = data.chatLog.map(o => {
            let n = Object.assign(new DigifuChatMessage(), o);
            n.thaw();
            return n;
        });
        this.stats = data.stats;

        // remove "live" references to users.
        this.users = [];
        this.instrumentCloset.forEach(i => { i.ReleaseOwnership(); });
    }

    // returns { user, index } or null.
    FindUserByID(userID) {
        let idx = this.users.findIndex(user => user.userID == userID);
        if (idx == -1) return null;
        return { user: this.users[idx], index: idx };
    };

    // returns { instrument, index } or null.
    FindInstrumentById(instrumentID) {
        let idx = this.instrumentCloset.findIndex(instrument => instrument.instrumentID == instrumentID);
        if (idx == -1) return null;
        return { instrument: this.instrumentCloset[idx], index: idx };
    };

    // returns { instrument, index } or null.
    FindInstrumentByUserID(userID) {
        let idx = this.instrumentCloset.findIndex(instrument => instrument.controlledByUserID == userID);
        if (idx == -1) return null;
        return { instrument: this.instrumentCloset[idx], index: idx };
    };

    static FromJSONData(data) {
        // thaw into live classes
        let ret = Object.assign(new DigifuRoomState(), data);

        // deal with instruments which are copies of instrumentns. expand them.
        for (let idx = 0; idx < ret.instrumentCloset.length; ++idx) {
            let i = ret.instrumentCloset[idx];
            if (!i.copyOfInstrumentID) continue;

            let base = ret.instrumentCloset.find(o => o.instrumentID == i.copyOfInstrumentID);

            if (!base) {
                // fallback: load from global instrument list
                base = gGlobalInstruments.find(o => o.instrumentID == i.copyOfInstrumentID);
            }

            console.assert(!!base, `Instrument is based on nonexistent instrument ${i.copyOfInstrumentID}`);
            // create a clone of the base
            let n = JSON.parse(JSON.stringify(base));
            // apply modifications
            i.copyOfInstrumentID = null;
            ret.instrumentCloset[idx] = Object.assign(n, i);
        }

        ret.thaw();

        return ret;
    }
};



let routeToRoomID = function (r) {
    let requestedRoomID = r;
    if (requestedRoomID.length < 1) return "pub"; // for 0-length strings return a special valid name.

    // trim slashes
    if (requestedRoomID[0] == '/') requestedRoomID = requestedRoomID.substring(1);
    if (requestedRoomID[requestedRoomID.length - 1] == '/') requestedRoomID = requestedRoomID.substring(0, requestedRoomID.length - 1);

    if (requestedRoomID.length < 1) return "pub"; // for 0-length strings return a special valid name.

    return requestedRoomID.toLowerCase();
};


// returns null if not a valid username.
let sanitizeUsername = function (n) {
    if (typeof (n) != 'string') return null;
    n = n.trim();
    if (n.length < ServerSettings.UsernameLengthMin) return null;
    if (n.length > ServerSettings.UsernameLengthMax) return null;
    return n;
};

// returns null if not a valid username.
let sanitizeUserColor = function (n) {
    if (typeof (n) != 'string') return null;
    n = n.trim();
    if (n.length < ServerSettings.UserColorLengthMin) return null;
    if (n.length > ServerSettings.UserColorLengthMax) return null;
    return n;
};

let sanitizeCheerText = function (n) {
    if (typeof (n) != 'string') return null;
    n = n.trim();
    if (n.length == 0) return null;
    return String.fromCodePoint(n.codePointAt(0));
}

module.exports = {
    ClientMessages,
    ServerMessages,
    DigifuUser,
    InstrumentParamType,
    InstrumentParam,
    DigifuInstrumentSpec,
    DigifuChatMessage,
    ChatMessageType,
    DigifuRoomState,
    ServerSettings,
    ClientSettings,
    routeToRoomID,
    sanitizeUsername,
    sanitizeUserColor,
    sanitizeCheerText,
    generateID,
    RoomItem,
    RoomFn,
    RoomFns,
    DFRoomItemType,
    AccessLevels,
    SetGlobalInstrumentList,
    InternalInstrumentParams,
};
