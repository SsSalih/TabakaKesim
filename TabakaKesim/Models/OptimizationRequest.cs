using System.Collections.Generic;

namespace TabakaKesim.Models;

public class OptimizationRequest
{
    public List<Part> Parts { get; set; } = new();
    public StockSheet Sheet { get; set; } = new();
}
