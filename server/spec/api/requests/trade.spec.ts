import ValidationError from "../../../errors/validation";
import { 
    mapToTradeSendStarToPlayerRequest,
} from "../../../api/requests/trade"

describe("mapToTradeSendStarToPlayerRequest", () => {
    it("should map to TradeSendStarToPlayerRequest", () => {
        let body = {
            toPlayerId: "1",
            starId: "2",
        }
        let result = mapToTradeSendStarToPlayerRequest(body)
        expect(result.toPlayerId.toString()).toBe(body.toPlayerId.toString())
        expect(result.starId.toString()).toBe(body.starId.toString())
    })
    it("should require toPlayerId in body", () => {
        let body = {
            starId: "2",
        }
        expect(() => mapToTradeSendStarToPlayerRequest(body)).toThrowError(ValidationError, "toPlayerId is required")
    })
    it("should require starId in body", () => {
        let body = {
            toPlayerId: "1",
        }
        expect(() => mapToTradeSendStarToPlayerRequest(body)).toThrowError(ValidationError, "starId is required")
    })
})