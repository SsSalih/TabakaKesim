using System;

namespace TabakaKesim.Models
{
    public class CalculationRecord
    {
        public int Id { get; set; }
        public DateTime Date { get; set; }
        public string Summary { get; set; } = string.Empty;
        public string InputJson { get; set; } = string.Empty;
        public string ResultJson { get; set; } = string.Empty;
    }
}
