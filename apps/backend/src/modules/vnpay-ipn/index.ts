import { Module } from "@medusajs/framework/utils"
import VnpayIpnModuleService from "./service"

export const VNPAY_IPN_MODULE = "vnpayIpn"

export default Module(VNPAY_IPN_MODULE, { service: VnpayIpnModuleService })
