using TabakaKesim.Models;

namespace TabakaKesim.Services;

public class GuillotinePackerService
{
    private CutNode root; // Ana tabaka (Kök düğüm)
    private double kerf; // Testere payı

    public GuillotinePackerService(double sheetWidth, double sheetHeight, double kerfSize)
    {
        this.kerf = kerfSize;
        // Başlangıçta tüm tabaka tek bir boş düğümdür
        root = new CutNode { X = 0, Y = 0, Width = sheetWidth, Height = sheetHeight };
    }

    // Parça yerleştirme fonksiyonu
    public CutNode Insert(double width, double height)
    {
        return FindNode(root, width, height);
    }

    // Recursive (Kendini çağıran) arama fonksiyonu
    private CutNode FindNode(CutNode node, double w, double h)
    {
        // 1. Eğer bu düğüm zaten kullanılmışsa, çocuklarına (sağ ve alt) bak
        if (node.Used)
        {
            var rightNode = FindNode(node.Right, w, h);
            if (rightNode != null) return rightNode;

            return FindNode(node.Down, w, h);
        }

        // 2. Eğer parça bu alana sığmıyorsa null dön
        if (w > node.Width || h > node.Height) return null;

        // 3. Eğer tam sığıyorsa (veya çok yakınsa) burayı kullan
        if (w == node.Width && h == node.Height)
        {
            node.Used = true;
            return node;
        }

        // 4. SIĞIYOR AMA BOŞLUK VAR -> KESME İŞLEMİ (Split)
        // Burası Gilyotin mantığının kalbi. Alanı bölüyoruz.
        node.Used = true;
        node.Right = new CutNode 
        { 
            X = node.X + w + kerf, // Testere payını eklemeyi unutma
            Y = node.Y, 
            Width = node.Width - w - kerf, 
            Height = h 
        };
        
        node.Down = new CutNode 
        { 
            X = node.X, 
            Y = node.Y + h + kerf, 
            Width = node.Width, 
            Height = node.Height - h - kerf 
        };

        // Bu düğüm artık bir parça tutuyor, ama aslında bölündü.
        // Asıl parça sol üst köşeye (node'un kendisine) yerleşmiş sayılır, 
        // ama width/height değerlerini yerleşen parçaya göre güncellemelisin.
        node.Width = w;
        node.Height = h;
        
        return node;
    }

    // Talimatları toplayacak ana fonksiyon
public List<CuttingInstruction> GetInstructions()
{
    var instructions = new List<CuttingInstruction>();
    int stepCounter = 1;

    // Ağacı gezmeye başla (Recursive)
    TraverseTree(root, instructions, ref stepCounter);
    
    return instructions;
}

// Ağacı gezen yardımcı fonksiyon (Pre-order Traversal)
private void TraverseTree(CutNode node, List<CuttingInstruction> list, ref int step)
{
    // Eğer bu düğümde bir parça varsa, kesim yapılmış demektir.
    if (node.Used && node.PartId.HasValue)
    {
        // NOT: Bizim algoritmamız parçayı sol-üste koyup Right ve Down diye bölmüştü.
        // Bu, fiziksel olarak şu anlama gelir:
        // Önce Y ekseninde (Yatay) bir kesim yapıp ALT tarafı ayırdık.
        // Sonra X ekseninde (Dikey) bir kesim yapıp SAĞ tarafı ayırdık.

        // 1. KESİM (Yatay - Horizontal): Alt bloğu ayır
        // Eğer altta bir alan oluşmuşsa (yani kesim gerekmişse)
        if (node.Down != null) 
        {
            list.Add(new CuttingInstruction
            {
                StepNumber = step++,
                Description = $"Yatay kesim yap (Y={node.Y + node.Height}). Alt bloğu ayır.",
                Axis = "y",
                CutValue = node.Y + node.Height + kerf, // Bıçağın geleceği yer
                IsPartFinished = false
            });
        }

        // 2. KESİM (Dikey - Vertical): Yan bloğu ayır ve parçayı çıkar
        // Eğer sağda bir alan varsa veya parça tam buraya oturmuşsa
        list.Add(new CuttingInstruction
        {
            StepNumber = step++,
            Description = $"Dikey kesim yap (X={node.X + node.Width}). Parça {node.PartId} hazır!",
            Axis = "x",
            CutValue = node.X + node.Width + kerf,
            IsPartFinished = true,
            FinishedPartId = node.PartId
        });

        // Şimdi oluşan yeni atık/boş parçaların içine gir (Recursive)
        // Önce Right (Sağ) taraftaki işlemleri bitir, sonra Down (Alt) tarafa geç.
        if (node.Right != null) TraverseTree(node.Right, list, ref step);
        if (node.Down != null) TraverseTree(node.Down, list, ref step);
    }
    // Eğer node kullanılmış ama parça yoksa (sadece bir gruplama düğümü ise)
    else if (node.Used)
    {
        if (node.Right != null) TraverseTree(node.Right, list, ref step);
        if (node.Down != null) TraverseTree(node.Down, list, ref step);
    }
}
}