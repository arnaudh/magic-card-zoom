const OrbDescriptor = require('./orb_descriptor.js');

function descriptorFromName(name) {
    if (name.startsWith('orb')) {
        return new OrbDescriptor(name);
    } else {
        throw `Unknown descriptor name ${name}`;
    }
}

module.exports.fromName = descriptorFromName;
