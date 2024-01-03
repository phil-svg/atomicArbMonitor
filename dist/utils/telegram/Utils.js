export function getTokenURL(tokenAddress) {
    return "https://etherscan.io/token/" + tokenAddress;
}
export function getPoolURL(poolAddress) {
    return "https://etherscan.io/address/" + poolAddress;
}
export function getTxHashURLfromEtherscan(txHash) {
    return "https://etherscan.io/tx/" + txHash;
}
export function getBlockURLfromEtherscan(txHash) {
    return "https://etherscan.io/block/" + txHash;
}
export function getBotUrlEigenphi(address) {
    return "https://eigenphi.io/mev/ethereum/contract/" + address;
}
export function getTxHashURLfromEigenPhi(txHash) {
    return "https://eigenphi.io/mev/eigentx/" + txHash;
}
export function getAddressURL(buyerAddress) {
    return "https://etherscan.io/address/" + buyerAddress;
}
export function formatForPrint(someNumber) {
    if (typeof someNumber === "string" && someNumber.includes(","))
        return someNumber;
    if (someNumber > 100) {
        someNumber = Number(Number(someNumber).toFixed(0)).toLocaleString();
    }
    else {
        someNumber = Number(Number(someNumber).toFixed(2)).toLocaleString();
    }
    return someNumber;
}
export function hyperlink(link, name) {
    return "<a href='" + link + "/'> " + name + "</a>";
}
export function shortenAddress(address) {
    return address.slice(0, 5) + ".." + address.slice(-2);
}
export function shortenAddressForMevBot(address) {
    const lowerCase = address.toLowerCase();
    return lowerCase.slice(0, 9) + ".." + lowerCase.slice(-3);
}
export function getBlockBuilderLine(blockBuilderAddress) {
    if (blockBuilderAddress === null)
        return `Blockbuilder: unknown`;
    let blockBuilderTag;
    const rsyncBuilder = "0x1f9090aaE28b8a3dCeaDf281B0F12828e676c326";
    const beaverBuild = "0x95222290DD7278Aa3Ddd389Cc1E1d165CC4BAfe5";
    const flashbots = "0xDAFEA492D9c6733ae3d56b7Ed1ADB60692c98Bc5";
    const titanBuilder = "0x4838B106FCe9647Bdf1E7877BF73cE8B0BAD5f97";
    if (blockBuilderAddress.toLowerCase() === rsyncBuilder.toLowerCase()) {
        blockBuilderTag = "rsync-builder";
    }
    else if (blockBuilderAddress.toLowerCase() === beaverBuild.toLowerCase()) {
        blockBuilderTag = "beaverbuild";
    }
    else if (blockBuilderAddress.toLowerCase() === flashbots.toLowerCase()) {
        blockBuilderTag = "Flashbots";
    }
    else if (blockBuilderAddress.toLowerCase() === titanBuilder.toLowerCase()) {
        blockBuilderTag = "Titan Builder";
    }
    else {
        blockBuilderTag = shortenAddress(blockBuilderAddress);
    }
    const etherscanUrl = getAddressURL(blockBuilderAddress);
    const blockBuilderLine = `${hyperlink(etherscanUrl, blockBuilderTag)}`;
    return blockBuilderLine;
}
export function trimTrailingZeros(input) {
    // Check if the input contains a decimal point
    if (input.includes(".")) {
        // Remove trailing zeros after the decimal point and the decimal point itself if it becomes redundant
        return input.replace(/(\.\d*?[1-9])0+$|\.0*$/, "$1");
    }
    // Return the original input if no decimal point is found
    return input;
}
//# sourceMappingURL=Utils.js.map