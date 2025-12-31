namespace TabakaKesim.Models;

public class CutNode
{
    public double X { get; set; } // Koordinat X
    public double Y { get; set; } // Koordinat Y
    public double Width { get; set; }
    public double Height { get; set; }
    public bool Used { get; set; } // Dolu mu?
    public int? PartId { get; set; } // Hangi parça buraya kondu?
    
    // Ağaç yapısı: Her kesim iki yeni alan doğurur
    public CutNode Right { get; set; } // Kesimden sonra sağda kalan boşluk
    public CutNode Down { get; set; }  // Kesimden sonra altta kalan boşluk
}