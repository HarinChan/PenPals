using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;

namespace PenPals
{
    public sealed partial class MainWindow : Window
    {
        public MainWindow()
        {
            this.InitializeComponent();
            this.Title = "PenPals";
        }

        private void ClickMeButton_Click(object sender, RoutedEventArgs e)
        {
            ResponseText.Text = "Hello from WinUI!";
        }
    }
}