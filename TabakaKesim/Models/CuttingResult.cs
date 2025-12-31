namespace TabakaKesim.Models;

public class CuttingResult
{
    public StockSheet Sheet { get; set; }
    public List<PlacedPart> Layout { get; set; } = new();
    public List<CutStep> Steps { get; set; } = new();
}

public class PlacedPart
{
    public int PartId { get; set; }
    public double X { get; set; }
    public double Y { get; set; }
    public double W { get; set; }
    public double H { get; set; }
    public int FinishedAtStep { get; set; }
}

public class CutStep
{
    public int StepNumber { get; set; }
    public string Description { get; set; }
    public string? Axis { get; set; } // "x" or "y"
    public double CutValue { get; set; }
}
