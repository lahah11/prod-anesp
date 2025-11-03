function generateMissionReference(year, sequence) {
  const seq = String(sequence).padStart(4, '0');
  return `MIS-${year}-${seq}`;
}

module.exports = { generateMissionReference };
