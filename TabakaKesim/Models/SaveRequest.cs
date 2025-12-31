namespace TabakaKesim.Models
{
    public class SaveRequest
    {
        public string Name { get; set; } = string.Empty;
        public OptimizationRequest Request { get; set; }
    }
}
