namespace TabakaKesim.Models
{
    public class CuttingInstruction
    {
        public int StepNumber { get; set; } // Adım sırası (1, 2, 3...)
        public string Description { get; set; } // Ustaya mesaj: "Parçayı dikey kes"
        public string Axis { get; set; } // "x" (Dikey) veya "y" (Yatay)
        public double CutValue { get; set; } // Bıçağın vuracağı mm (Örn: 504. mm)
        public bool IsPartFinished { get; set; } // Bu kesim sonucunda bir parça çıkıyor mu?
        public int? FinishedPartId { get; set; } // Çıkan parçanın ID'si
    }
}